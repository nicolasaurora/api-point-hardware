import { PurchaseOrder } from '../models/PurchaseOrder.js';
import { OrderDetails } from "../models/OrderDetails.js";
import { Product } from "../models/Product.js";
import { User } from "../models/User.js";
import { sequelize } from "../config/db.js";
import { logError, sendError } from "../utils/errorResponse.js";


export const getPurchaseOrders = async (req, res) => {
    try {
        const purchaseOrders = await PurchaseOrder.findAll({
          include: [
            {
              model: User,
              as: "user",
              attributes: ["firstName", "lastName"],
            },
          ],
        });

        res.json(purchaseOrders);
    } catch (error) {
        logError("getPurchaseOrders", error);
        return sendError(res, 500, "Error al obtener órdenes de compra.", "INTERNAL_SERVER_ERROR");
    }
}

export const getMyPurchaseOrders = async (req, res) => {
  try {
    const userId = req.user.id;

    if (!userId) {
      return sendError(res, 401, "El token no contiene un usuario válido. Iniciá sesión nuevamente.", "INVALID_TOKEN");
    }

    const orders = await PurchaseOrder.findAll({
      where: {
        userId
      }
    });

    return res.json(orders);
    
  } catch (error) {
    logError("getMyPurchaseOrders", error);
    return sendError(res, 500, "Error al obtener tus órdenes de compra.", "INTERNAL_SERVER_ERROR");
  }
};


export const getPurchaseOrder = async(req, res) => {
  try {
    const { id } = req.params;

    const purchaseOrder = await PurchaseOrder.findByPk(id, {
      include: [
        {
          model: User,
          as: "user",
          attributes: ["firstName", "lastName"],
        },
        {
          model: OrderDetails,
          as: "orderDetails",
          attributes: ["quantity", "unitPrice"],
          include: [
            {
              model: Product,
              as: "product",
              attributes: ["id", "name", "image", "category"],
            }  
          ],
        }
      ]
    });

    if(!purchaseOrder) {
      return sendError(res, 404, "La orden de compra no existe.", "ORDER_NOT_FOUND");
    }

    const isAdmin = req.user.role === "admin" || req.user.role === "superadmin";

    const isOwner = purchaseOrder.userId === req.user.id;

    if (!isAdmin && !isOwner) {
      return sendError(res, 403, "No tenés permiso para ver esta orden.", "FORBIDDEN");
    }

    res.json(purchaseOrder);

  } catch (error) {
    logError("getPurchaseOrder", error);
    return sendError(res, 500, "Error al obtener la orden de compra.", "INTERNAL_SERVER_ERROR");
  }
}


export const createPurchaseOrder = async (req, res) => {
  const { items } = req.body;
  const userId = req.user.id;

  if (!userId || !Array.isArray(items) || items.length === 0) {
    return sendError(
      res,
      400,
      "El usuario y al menos un producto son obligatorios.",
      "INVALID_ORDER"
    );
  }

  let transaction;

  try {
    transaction = await sequelize.transaction();

    const user = await User.findByPk(userId, { transaction });

    if (!user) {
      await transaction.rollback();

      return sendError(res, 404, "Usuario no encontrado.", "USER_NOT_FOUND");
    }

    let total = 0;
    const details = [];

    for (const item of items) {
      const { productId, quantity } = item;

      if (!productId || !Number.isInteger(quantity) || quantity <= 0) {

        await transaction.rollback();

        return sendError(
          res,
          400,
          "Cada producto debe tener un ID y una cantidad mayor a cero.",
          "INVALID_ORDER"
        );
      }

      const product = await Product.findByPk(productId, {
        transaction,
      });

      if (!product) {
        await transaction.rollback();

        return sendError(res, 404, "Producto no encontrado.", "PRODUCT_NOT_FOUND");
      }

      if (product.stock < quantity) {
        await transaction.rollback();

        return sendError(res, 400, "Stock insuficiente para el producto solicitado.", "INSUFFICIENT_STOCK");
      }

      total += Number(product.price) * quantity;

      details.push({
        product,
        quantity,
      });
    }

    const purchaseOrder = await PurchaseOrder.create(
      {
        userId,
        total: total.toFixed(2),
      },
      { transaction }
    );

    for (const detail of details) {
      await OrderDetails.create(
        {
          purchaseOrderId: purchaseOrder.id,
          productId: detail.product.id,
          quantity: detail.quantity,
          unitPrice: detail.product.price,
        },
        { transaction }
      );

      await detail.product.update(
        {
          stock: detail.product.stock - detail.quantity,
        },
        { transaction }
      );
    }

    await transaction.commit();

    return res.status(201).json({
      message: "Orden de compra creada correctamente.",
      order: purchaseOrder,
    });
    
  } catch (error) {
    if (transaction) {
      await transaction.rollback();
    }

    logError("createPurchaseOrder", error);
    return sendError(res, 500, "Error al crear la orden de compra.", "INTERNAL_SERVER_ERROR");
  }

}


