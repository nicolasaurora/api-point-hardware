import { Router } from "express";
import {
  getDashboardSummary,
  getLowStockProducts,
  getSalesOverTime,
  getTopProducts,
} from "../service/dashboardService.js";
import { verifyRole, verifyToken } from "../middleware/authMiddleware.js";

const router = Router();

router.get("/dashboard/summary", verifyToken, verifyRole("superadmin", "admin"), getDashboardSummary);

router.get("/dashboard/top-products", verifyToken, verifyRole("superadmin", "admin"), getTopProducts);

router.get("/dashboard/sales-over-time", verifyToken, verifyRole("superadmin", "admin"), getSalesOverTime);

router.get("/dashboard/low-stock", verifyToken, verifyRole("superadmin", "admin"), getLowStockProducts);

export default router;
