# Backend Point Hardware

Backend para una aplicación de ventas, desarrollado con Node.js, Express, Sequelize y MySQL.

## Tecnologías

- Node.js
- Express
- Sequelize
- MySQL
- JWT
- bcrypt
- CORS


## Roles

- `superadmin`: administra usuarios, roles, productos y órdenes.
- `admin`: administra productos y consulta usuarios y órdenes.
- `user`: consulta productos, crea órdenes y ve sus propias compras.

## Autenticación

La API utiliza JWT. Para las rutas protegidas se debe enviar:

```http
Authorization: Bearer TOKEN
```

## Endpoints principales

| Método | Ruta | Acceso |
|---|---|---|
| POST | `/users` | Público |
| POST | `/login` | Público |
| GET | `/users` | Admin / Superadmin |
| PATCH | `/users/:id/role` | Superadmin |
| GET | `/products` | Público |
| POST | `/products` | Admin / Superadmin |
| PUT | `/products/:id` | Admin / Superadmin |
| DELETE | `/products/:id` | Admin / Superadmin |
| GET | `/orders` | Admin / Superadmin |
| GET | `/orders/my-orders` | Usuario autenticado |
| GET | `/orders/:id` | Dueño, Admin o Superadmin |
| POST | `/orders` | User |
| GET | `/dashboard/summary` | Facturación, órdenes, ticket promedio y unidades vendidas. |
| GET | `/dashboard/top-products` | Ranking de los cinco productos más vendidos. |
| GET | `/dashboard/sales-over-time` | Evolución de ventas por día. Admite `from` y `to` en formato `YYYY-MM-DD`. |
| GET | `/dashboard/low-stock` | Productos con stock menor o igual a 5 unidades. |
| GET | `/dashboard/insights` | Insights automáticos basados en ventas y stock reales. |

Los insights del dashboard no utilizan servicios externos de IA ni generan costos. Analizan métricas reales para informar productos destacados, bajo stock, falta de ventas y estado general del inventario.

## Modelo de producto

```json
{
  "name": "mouse logitech",
  "price": 25000,
  "stock": 10,
  "image": "https://ejemplo.com/imagen.jpg",
  "category": "mouse"
}
```

## Crear una orden

```json
{
  "items": [
    {
      "productId": 1,
      "quantity": 2
    }
  ]
}
```

El usuario que realiza la orden se obtiene desde el token. El backend valida stock, calcula el total, registra los detalles y descuenta las unidades mediante una transacción.


