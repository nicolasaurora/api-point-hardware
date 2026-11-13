import { Product } from '../models/Product.js';
import {
    isUniqueConstraintError,
    isValidationError,
    logError,
    sendError,
} from "../utils/errorResponse.js";

export const getProducts = async (req, res) => {
    try {
        const products = await Product.findAll();

        res.json(products);
    } catch (error) {
        logError("getProducts", error);
        return sendError(res, 500, "Error al obtener productos.", "INTERNAL_SERVER_ERROR");
    }
};

export const getProduct = async (req, res) => {
    try {
        const { id } = req.params;

        const product = await Product.findByPk(id);

        if(!product) {
            return sendError(res, 404, "Producto no encontrado.", "PRODUCT_NOT_FOUND");
        }

        res.json(product);

    } catch (error) {
        logError("getProduct", error);
        return sendError(res, 500, "Error al obtener el producto.", "INTERNAL_SERVER_ERROR");
    }
};

export const createProduct = async (req, res) => {
    try {
        const { name, price, stock, image, category } = req.body;

        if (
            typeof name !== "string" ||
            !name.trim() ||
            price === undefined ||
            typeof image !== "string" ||
            !image.trim() ||
            typeof category !== "string" ||
            !category.trim()
        ) {
            return sendError(
                res,
                400,
                "El nombre, precio, imagen y categoría son datos obligatorios.",
                "INVALID_PRODUCT_DATA"
            );
        }    
        
        const nameLower = name.trim().toLowerCase();
        const categoryLower = category.trim().toLowerCase();

        const existingProduct = await Product.findOne({
            where: { name: nameLower }
        });

        if(existingProduct) {
            return sendError(res, 409, "El nombre del producto ya existe.", "PRODUCT_NAME_ALREADY_EXISTS");
        }


        const newProduct = await Product.create({
            name: nameLower,
            price,
            stock,
            image,
            category: categoryLower,
        });


        res.status(201).json({
            message: "Producto creado correctamente.",
            product: `${newProduct.name}`
        });
    } catch (error) {
        if (isUniqueConstraintError(error)) {
            return sendError(res, 409, "El nombre del producto ya existe.", "PRODUCT_NAME_ALREADY_EXISTS");
        }

        if (isValidationError(error)) {
            return sendError(res, 400, "Los datos del producto no son válidos.", "INVALID_PRODUCT_DATA");
        }

        logError("createProduct", error);
        return sendError(res, 500, "Error al crear el producto.", "INTERNAL_SERVER_ERROR");
    }
}


export const updateProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const product = await Product.findByPk(id)
        const { name, price, stock, image, category } = req.body;

        if(!product) {
            return sendError(res, 404, "Producto no encontrado.", "PRODUCT_NOT_FOUND");
        }

        
        await product.update({
            name,
            price,
            stock,
            image,
            category,
        });

        res.status(200).json({
            message: `Producto actualizado: ${product.name}.`
        });
    } catch (error) {
        if (isUniqueConstraintError(error)) {
            return sendError(res, 409, "El nombre del producto ya existe.", "PRODUCT_NAME_ALREADY_EXISTS");
        }

        if (isValidationError(error)) {
            return sendError(res, 400, "Los datos del producto no son válidos.", "INVALID_PRODUCT_DATA");
        }

        logError("updateProduct", error);
        return sendError(res, 500, "Error al actualizar el producto.", "INTERNAL_SERVER_ERROR");
    }

}

export const deleteProduct = async(req, res) => {
    try {
        const { id } = req.params;
        const product = await Product.findByPk(id);

        if(!product) {
           return sendError(res, 404, "Producto no encontrado.", "PRODUCT_NOT_FOUND");
        }

        await product.destroy();

        res.status(200).json({
            message: `Producto con id: ${id} eliminado.`
        });
    } catch (error) {
        logError("deleteProduct", error);
        return sendError(res, 500, "Error al eliminar el producto.", "INTERNAL_SERVER_ERROR");
    }
}
