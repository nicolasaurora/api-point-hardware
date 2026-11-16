import { fn, col, Op, QueryTypes } from "sequelize";
import { PurchaseOrder } from "../models/PurchaseOrder.js";
import { OrderDetails } from "../models/OrderDetails.js";
import { Product } from "../models/Product.js";
import { sequelize } from "../config/db.js";
import { logError, sendError } from "../utils/errorResponse.js";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MAX_DASHBOARD_RANGE_DAYS = 365;
const LOW_STOCK_THRESHOLD = 5;

const formatDate = (date) => date.toISOString().slice(0, 10);

const isValidDate = (value) => {
  if (typeof value !== "string" || !DATE_PATTERN.test(value)) {
    return false;
  }

  const parsedDate = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsedDate.getTime()) && formatDate(parsedDate) === value;
};

const getDashboardSummaryData = async () => {
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

  return {
    totalRevenue: Number(orderSummary.totalRevenue),
    totalOrders: Number(orderSummary.totalOrders),
    averageTicket: Number(orderSummary.averageTicket),
    unitsSold: Number(unitsSummary.unitsSold),
  };
};

const getTopProductsData = async () => {
  const topProducts = await sequelize.query(
    `
      SELECT
        od.productId AS productId,
        p.name AS name,
        SUM(od.quantity) AS unitsSold,
        SUM(od.quantity * od.unitPrice) AS revenue
      FROM order_details AS od
      INNER JOIN products AS p ON p.id = od.productId
      GROUP BY od.productId, p.id, p.name
      ORDER BY unitsSold DESC, revenue DESC
      LIMIT 5
    `,
    { type: QueryTypes.SELECT }
  );

  return topProducts.map((product) => ({
    productId: Number(product.productId),
    name: product.name,
    unitsSold: Number(product.unitsSold),
    revenue: Number(product.revenue),
  }));
};

const getLowStockProductsData = async () => {
  return Product.findAll({
    attributes: ["id", "name", "stock", "category", "image"],
    where: {
      stock: {
        [Op.lte]: LOW_STOCK_THRESHOLD,
      },
    },
    order: [
      ["stock", "ASC"],
      ["name", "ASC"],
    ],
    raw: true,
  });
};

const formatCurrency = (amount) => {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(amount);
};

export const getDashboardSummary = async (req, res) => {
  try {
    const summary = await getDashboardSummaryData();
    return res.json(summary);
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

export const getTopProducts = async (req, res) => {
  try {
    const topProducts = await getTopProductsData();
    return res.json(topProducts);
  } catch (error) {
    logError("getTopProducts", error);
    return sendError(
      res,
      500,
      "Error al obtener los productos más vendidos.",
      "INTERNAL_SERVER_ERROR"
    );
  }
};

export const getSalesOverTime = async (req, res) => {
  const today = new Date();
  const defaultTo = formatDate(today);
  const defaultFromDate = new Date(today);
  defaultFromDate.setUTCDate(defaultFromDate.getUTCDate() - 29);
  const defaultFrom = formatDate(defaultFromDate);

  const from = req.query.from ?? defaultFrom;
  const to = req.query.to ?? defaultTo;

  if (!isValidDate(from) || !isValidDate(to)) {
    return sendError(
      res,
      400,
      "Las fechas deben tener el formato YYYY-MM-DD.",
      "INVALID_DATE_RANGE"
    );
  }

  const fromDate = new Date(`${from}T00:00:00.000Z`);
  const toDate = new Date(`${to}T00:00:00.000Z`);
  const rangeInDays = Math.floor((toDate - fromDate) / 86_400_000) + 1;

  if (rangeInDays <= 0 || rangeInDays > MAX_DASHBOARD_RANGE_DAYS) {
    return sendError(
      res,
      400,
      "El rango de fechas debe ser de entre 1 y 365 días.",
      "INVALID_DATE_RANGE"
    );
  }

  try {
    const sales = await sequelize.query(
      `
        SELECT
          DATE(\`date\`) AS date,
          SUM(total) AS revenue,
          COUNT(id) AS orders
        FROM purchase_orders
        WHERE \`date\` >= :from
          AND \`date\` < DATE_ADD(:to, INTERVAL 1 DAY)
        GROUP BY DATE(\`date\`)
        ORDER BY date ASC
      `,
      {
        replacements: { from, to },
        type: QueryTypes.SELECT,
      }
    );

    return res.json(
      sales.map((sale) => ({
        date: sale.date instanceof Date ? formatDate(sale.date) : sale.date,
        revenue: Number(sale.revenue),
        orders: Number(sale.orders),
      }))
    );
  } catch (error) {
    logError("getSalesOverTime", error);
    return sendError(
      res,
      500,
      "Error al obtener la evolución de ventas.",
      "INTERNAL_SERVER_ERROR"
    );
  }
};

export const getLowStockProducts = async (req, res) => {
  try {
    const products = await getLowStockProductsData();

    return res.json({
      threshold: LOW_STOCK_THRESHOLD,
      products,
    });
  } catch (error) {
    logError("getLowStockProducts", error);
    return sendError(
      res,
      500,
      "Error al obtener los productos con bajo stock.",
      "INTERNAL_SERVER_ERROR"
    );
  }
};

export const getDashboardInsights = async (req, res) => {
  try {
    const [summary, topProducts, lowStockProducts] = await Promise.all([
      getDashboardSummaryData(),
      getTopProductsData(),
      getLowStockProductsData(),
    ]);

    const insights = [];

    if (summary.totalOrders === 0) {
      insights.push({
        type: "info",
        code: "NO_SALES",
        title: "Sin ventas registradas",
        message: "Todavía no se registraron órdenes de compra.",
      });
    } else {
      insights.push({
        type: "success",
        code: "SALES_SUMMARY",
        title: "Resumen de ventas",
        message: `Se registraron ${summary.totalOrders} órdenes por un total de ${formatCurrency(summary.totalRevenue)}.`,
      });

      const topProduct = topProducts[0];
      if (topProduct) {
        insights.push({
          type: "success",
          code: "TOP_PRODUCT",
          title: "Producto más vendido",
          message: `${topProduct.name} lidera las ventas con ${topProduct.unitsSold} unidades vendidas.`,
          productId: topProduct.productId,
        });
      }
    }

    const outOfStockProducts = lowStockProducts.filter((product) => product.stock === 0);
    if (outOfStockProducts.length > 0) {
      insights.push({
        type: "warning",
        code: "OUT_OF_STOCK",
        title: "Productos sin stock",
        message: `${outOfStockProducts.length} producto(s) no tienen unidades disponibles.`,
      });
    }

    const lowStockAvailableProducts = lowStockProducts.filter((product) => product.stock > 0);
    if (lowStockAvailableProducts.length > 0) {
      const productNames = lowStockAvailableProducts
        .slice(0, 3)
        .map((product) => product.name)
        .join(", ");
      const remainingProducts = lowStockAvailableProducts.length - 3;
      const remainingText = remainingProducts > 0 ? ` y ${remainingProducts} más` : "";

      insights.push({
        type: "warning",
        code: "LOW_STOCK",
        title: "Reposición recomendada",
        message: `Hay ${lowStockAvailableProducts.length} producto(s) con stock menor o igual a ${LOW_STOCK_THRESHOLD}: ${productNames}${remainingText}.`,
      });
    }

    if (lowStockProducts.length === 0) {
      insights.push({
        type: "success",
        code: "STOCK_HEALTHY",
        title: "Stock saludable",
        message: `No hay productos con stock menor o igual a ${LOW_STOCK_THRESHOLD}.`,
      });
    }

    return res.json({
      period: "Toda la historia",
      insights,
    });
  } catch (error) {
    logError("getDashboardInsights", error);
    return sendError(
      res,
      500,
      "Error al obtener los insights del dashboard.",
      "INTERNAL_SERVER_ERROR"
    );
  }
};
