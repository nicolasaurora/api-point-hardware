# API TPI

Backend para una aplicación de ventas, desarrollado con Node.js, Express, Sequelize y SQLite.

## Tecnologías

- Node.js
- Express
- Sequelize
- SQLite
- JWT
- bcrypt
- CORS

## Instalación

```bash
npm install
```

## Ejecución

Modo desarrollo:

```bash
npm run dev
```

El servidor se ejecuta en:

```text
http://localhost:3000
```

La base de datos SQLite se crea automáticamente como `tpi.db`.

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

## Modelo de producto

```json
{
  "name": "mouse logitech",
  "price": 25000,
  "stock": 10,
  "image": "https://ejemplo.com/imagen.jpg",
  "category": "mice"
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

## Frontend

CORS está configurado para permitir peticiones desde:

```text
http://localhost:5173
```
