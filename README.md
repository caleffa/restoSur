# restoSur Backend (Node.js + Express + MySQL)

Backend modular MVC para gestión de restaurantes/cervecerías con:
- POS (ventas)
- Cocina
- Caja
- Stock
- Facturación AFIP (CAE/CAEA)

## Requisitos
- Node.js 18+
- MySQL 8+

## Instalación
```bash
npm install
cp .env.example .env
```

Configurar credenciales en `.env`.

## Base de datos
```bash
mysql -u root -p < sql/schema.sql
```

> Si la base ya existía de una versión anterior, al iniciar el backend se auto-crean las tablas de caja faltantes (`cash_registers`, `cash_shifts`, `cash_movements`) para evitar errores 500 por tablas inexistentes.

## Levantar servidor
```bash
npm run dev
```

## Arquitectura
```
/src
  /config
  /controllers
  /routes
  /services
  /repositories
  /middlewares
  /utils
  /modules
    /auth
    /sales
    /cash
    /products
    /kitchen
    /afip
    /stock
    /tables
    /invoices
    /comandas
  app.js
  server.js
```

## Flujo end-to-end
1. Login (`/api/auth/login`) para obtener JWT.
2. Abrir caja (`/api/cash/open`).
3. Crear venta (`/api/sales`).
4. Agregar ítems (`/api/sales/:id/items`).
5. Enviar a cocina (`/api/kitchen/send/:saleId`).
6. Cobrar venta (`/api/sales/:id/pay`).
7. Facturar (`/api/invoices`).

Más detalle en `POSTMAN.md`.

## Frontend POS (React + Vite)
Se agregó una app frontend en `frontend/` con autenticación JWT, rutas protegidas por rol y gestión táctil de mesas.

### Ejecutar frontend
```bash
cd frontend
npm install
npm run dev
```

Variables:
- `VITE_API_URL` (default: `http://localhost:3000/api`)

## Comandas
- Acceso permitido para roles `ADMIN` y `COCINA`.
- GET `/comandas`
- GET `/comandas/:id`
- POST `/comandas`
- PATCH `/comandas/:id/status`
- DELETE `/comandas/:id`
