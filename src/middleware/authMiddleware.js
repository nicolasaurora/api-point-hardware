import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../config/config.js";
import { sendError } from "../utils/errorResponse.js";

export const verifyToken = (req, res, next) => {
    const header = req.header("Authorization") || "";
    const token = header.split(" ")[1];

    if (!token) {
        return sendError(res, 401, "Token de autorización requerido.", "INVALID_TOKEN");
    }

    try {
        const payload = jwt.verify(token, JWT_SECRET);

        req.user = payload;

        next();
    } catch (error) {
        return sendError(res, 401, "Token inválido o vencido.", "INVALID_TOKEN");
    }
};


export const verifyRole = (...rolesPermitidos) => {
    return (req, res, next) => {
        if (!req.user || !rolesPermitidos.includes(req.user.role)) {
            return sendError(res, 403, "No tenés permisos para realizar esta acción.", "FORBIDDEN");
        }

        next();
    };
};
