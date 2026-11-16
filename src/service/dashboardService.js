import { fn, col } from "sequelize";
import { PurchaseOrder } from "../models/PurchaseOrder.js";
import { OrderDetails } from "../models/OrderDetails.js";
import { logError, sendError } from "../utils/errorResponse.js";

export const getDashboardSummary = async (req, res) => {
  try {
    const orderSummary = await PurchaseOrder.findOne({
      attributes: [
        [fn("COALESCE", fn("SUM", col("total")), 0), "totalRevenue"],
        [fn("COUNT", col("id")), "totalOrders"],
        [fn("COALESCE", fn("AVG", col("total")), 0), "averageTicket"],
      ],
      raw: true,
    });

    const unitsSummary = await OrderDetails.findOne({
      attributes: [[fn("COALESCE", fn("SUM", col("quantity")), 0), "unitsSold"]],
      raw: true,
    });

    return res.json({
      totalRevenue: Number(orderSummary.totalRevenue),
      totalOrders: Number(orderSummary.totalOrders),
      averageTicket: Number(orderSummary.averageTicket),
      unitsSold: Number(unitsSummary.unitsSold),
    });
  } catch (error) {
    logError("getDashboardSummary", error);
    return sendError(
      res,
      500,
      "Error al obtener el resumen del dashboard.",
      "INTERNAL_SERVER_ERROR"
    );
  }
};
