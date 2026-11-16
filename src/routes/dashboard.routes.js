import { Router } from "express";
import { getDashboardSummary } from "../service/dashboardService.js";
import { verifyRole, verifyToken } from "../middleware/authMiddleware.js";

const router = Router();

router.get("/dashboard/summary", verifyToken, verifyRole("superadmin", "admin"), getDashboardSummary);

export default router;
