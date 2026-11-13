import { User } from "../models/User.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../config/config.js";
import {
    isUniqueConstraintError,
    isValidationError,
    logError,
    sendError,
} from "../utils/errorResponse.js";

export const getUsers = async (req, res) => {
    try {
        const users = await User.findAll({
            attributes: { exclude: ["password"] },
        });
        res.json(users);
    } catch (error) {
        logError("getUsers", error);
        return sendError(res, 500, "Error al obtener usuarios.", "INTERNAL_SERVER_ERROR");
    }
};

export const getUser = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await User.findByPk(id, {
            attributes: { exclude: ["password"] },
        });

        if (!user) {
            return sendError(res, 404, "Usuario no encontrado.", "USER_NOT_FOUND");
        }

        res.json(user);
    } catch (error) {
        logError("getUser", error);
        return sendError(res, 500, "Error al obtener el usuario.", "INTERNAL_SERVER_ERROR");
    }
}

export const createUser = async (req, res) => {
    try {
        const { firstName, lastName, email, password } = req.body;

        if (!firstName || !lastName || typeof email !== "string" || typeof password !== "string") {
           return sendError(
            res,
            400,
            "El nombre, apellido, email y contraseña son datos obligatorios.",
            "INVALID_USER_DATA"
           );
        }

        const emailLower = email.trim().toLowerCase();
        
        const existingUser = await User.findOne({
            where: { email: emailLower},
        });

        if (existingUser) {
            return sendError(res, 409, "El email ya se encuentra registrado.", "EMAIL_ALREADY_EXISTS");
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = await User.create( {
            firstName,
            lastName,
            email: emailLower,
            password: hashedPassword,
        });

        res.status(201).json({
            message: "Usuario creado correctamente",
            user: `${newUser.firstName} ${newUser.lastName}`
        });
    } catch (error) {
        if (isUniqueConstraintError(error)) {
            return sendError(res, 409, "El email ya se encuentra registrado.", "EMAIL_ALREADY_EXISTS");
        }

        if (isValidationError(error)) {
            return sendError(res, 400, "Los datos del usuario no son válidos.", "INVALID_USER_DATA");
        }

        logError("createUser", error);
        return sendError(res, 500, "Error al crear el usuario.", "INTERNAL_SERVER_ERROR");
    }
}

export const updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { firstName, lastName, email, password} = req.body;

        const user = await User.findByPk(id);

        if(!user) {
            return sendError(res, 404, "Usuario no encontrado.", "USER_NOT_FOUND");
        }

        if (!firstName || !lastName || typeof email !== "string" || typeof password !== "string") {
            return sendError(res, 400, "Los datos del usuario no son válidos.", "INVALID_USER_DATA");
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        await user.update({
            firstName,
            lastName,
            email: email.trim().toLowerCase(),
            password: hashedPassword,
        });

        res.json(`Usuario actualizado: ${user.firstName} ${user.lastName}`);
    } catch (error) {
        if (isUniqueConstraintError(error)) {
            return sendError(res, 409, "El email ya se encuentra registrado.", "EMAIL_ALREADY_EXISTS");
        }

        if (isValidationError(error)) {
            return sendError(res, 400, "Los datos del usuario no son válidos.", "INVALID_USER_DATA");
        }

        logError("updateUser", error);
        return sendError(res, 500, "Error al actualizar el usuario.", "INTERNAL_SERVER_ERROR");
    }
}

export const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await User.findByPk(id);
        if(!user) {
            return sendError(res, 404, "Usuario no encontrado.", "USER_NOT_FOUND");
        }
        await user.destroy();

        res.status(200).json({
            message: `Usuario con id: ${id} eliminado.`
        });
    } catch (error) {
        logError("deleteUser", error);
        return sendError(res, 500, "Error al eliminar el usuario.", "INTERNAL_SERVER_ERROR");
    }
}



export const loginUser = async (req,res) => {
    try {
    const { email, password } = req.body;

    if (typeof email !== "string" || typeof password !== "string") {
        return sendError(res, 401, "Email o contraseña incorrectos.", "INVALID_CREDENTIALS");
    }

    const emailLower = email.trim().toLowerCase();

    const user = await User.findOne({
        where: { email: emailLower }
    });

    if(!user) {
        return sendError(res, 401, "Email o contraseña incorrectos.", "INVALID_CREDENTIALS");
    }

    const coincide = await bcrypt.compare(password, user.password);

    if(!coincide) {
        return sendError(res, 401, "Email o contraseña incorrectos.", "INVALID_CREDENTIALS");
    }

    
    const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        JWT_SECRET,
        { expiresIn: "3h" }
    );


    return res.json(token);

    } catch (error) {
        logError("loginUser", error);
        return sendError(res, 500, "Error al iniciar sesión.", "INTERNAL_SERVER_ERROR");
    }

}

export const updateUserRole = async (req, res) => {
    try {
        const { id } = req.params;
        const { role } = req.body;

        const user = await User.findByPk(id);

        if (!user) {
            return sendError(res, 404, "Usuario no encontrado.", "USER_NOT_FOUND");
        }

        if (!["superadmin", "admin", "user"].includes(role)) {
            return sendError(res, 400, "El rol enviado no es válido.", "INVALID_ROLE");
        }

        await user.update({
            role: role
        });

        res.json("Rol de usuario actualizado.");
        
    } catch (error) {
        logError("updateUserRole", error);
        return sendError(res, 500, "Error al actualizar el rol.", "INTERNAL_SERVER_ERROR");
    }
}
