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


## Datos demo de operación (60 días)
Para cargar datos históricos con patrón realista (almuerzo/cena, fines de semana, ventas, compras y movimientos de caja/stock):

```bash
npm run seed:operacion
```

Opcionalmente se puede indicar cantidad de días (máximo 180):

```bash
node scripts/generateOperationalData.js 90
```

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

## AFIP homologación (CAE)
- `wsMode=MOCK`: emite CAE local (sin AFIP) para desarrollo.
- `wsMode=MANUAL`: exige `authorizationCode` manual para CAE.
- `wsMode=AFIP`: usa WSAA/WSFEv1 (requiere `cuit`, `pointOfSale`, `environment`, `certPath`, `keyPath`).
- Si al crear factura (`POST /api/invoices`) `authorizationType=CAE` llega sin `authorizationCode`, el backend:
  - consulta AFIP solo en `wsMode=AFIP`,
  - en `MOCK` genera CAE local,
  - en `MANUAL` devuelve error de validación.
- Para emitir `CAE` automático, configurar en `/afip/config`: `cuit`, `pointOfSale`, `environment=HOMOLOGACION` y rutas `certPath`/`keyPath`.
- Si AFIP demora en responder, ajustar `AFIP_WS_TIMEOUT_MS` (default `10000`) para evitar timeouts.
- Si al crear factura (`POST /api/invoices`) `authorizationType=CAE` llega sin `authorizationCode`, el backend solicita CAE a AFIP WSFEv1 y guarda también el número de comprobante (`voucher_number`).

## Frontend POS (React + Vite)
Se agregó una app frontend en `frontend/` con autenticación JWT, rutas protegidas por rol y gestión táctil de mesas.

### Ejecutar frontend
```bash
cd frontend
npm install
npm run dev
```

Variables:
- `VITE_API_URL` (default: usa el mismo protocolo del frontend, ej. `http://localhost:3000/api` o `https://localhost:3000/api`)

### Instalable para Windows (frontend)
Desde `frontend/` se puede generar un instalador `.exe` usando Electron Builder:

```bash
cd frontend
npm install
npm run build:desktop
```

El instalador queda en `frontend/release/`.

Configuración por PC:
- Editar `resources/runtime-config.js` dentro de la carpeta instalada (o `frontend/public/runtime-config.js` antes de compilar).
- Variables disponibles:
  - `VITE_API_URL` (ej: `https://IP_DEL_SERVIDOR:3000/api`)
  - `VITE_KITCHEN_WS_URL` (ej: `wss://IP_DEL_SERVIDOR:3000/ws/kitchen`)

Esto permite conectar cada PC a un backend distinto sin recompilar el frontend.

## Comandas
- Acceso permitido para roles `ADMIN` y `COCINA`.
- GET `/comandas`
- GET `/comandas/:id`
- POST `/comandas`
- PATCH `/comandas/:id/status`
- DELETE `/comandas/:id`


## HTTPS local
El backend y frontend están preparados para HTTPS en desarrollo.

Variables backend (`.env`):
- `HTTPS_ENABLED=true`
- `SSL_KEY_PATH=certs/localhost-key.pem`
- `SSL_CERT_PATH=certs/localhost.pem`

Variables frontend (`frontend/.env` opcional):
- `VITE_API_URL=https://localhost:3000/api`
- `VITE_SSL_KEY_PATH=../certs/localhost-key.pem`
- `VITE_SSL_CERT_PATH=../certs/localhost.pem`

Si no definís certificados para Vite, usa certificado autofirmado automático (`https: true`).
