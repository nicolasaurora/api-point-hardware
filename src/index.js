import express from 'express';
import "./models/associations.js";

import { PORT } from "./config/config.js";
import { sequelize } from './config/db.js';
import cors from "cors";

import userRoutes from './routes/user.routes.js';
import productRoutes from './routes/product.routes.js';
import purchaseOrderRoutes from './routes/purchaseOrder.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';

const app = express();

try {

    await sequelize.authenticate();

    app.use(express.json());
    
    app.use(cors({
        origin: [
            process.env.FRONTEND_URL,
            process.env.FRONTEND_URL2,
        ].filter(Boolean)
    }));
    
    app.use(userRoutes, productRoutes, purchaseOrderRoutes, dashboardRoutes);

    app.listen(PORT, () => {
        console.log(`Servidor escuchando en puerto ${PORT}`);
    });
    
} catch (error) {
    console.log(`Hubo un error en la inicialización`, error);
}




