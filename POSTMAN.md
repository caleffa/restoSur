# Endpoints para Postman

Base URL: `http://localhost:3000/api`

## Auth
- POST `/auth/login`

## Sales flujo completo
1. POST `/sales` { `branchId`, `tableId` }
2. POST `/sales/:id/items` { `productId`, `quantity`, `notes` }
3. POST `/kitchen/send/:saleId`
4. PATCH `/kitchen/:id` { `status`: `PENDIENTE|PREPARANDO|LISTO` }
5. POST `/sales/:id/pay`
6. POST `/invoices` { `saleId`, `invoiceType`, `authorizationType`, `authorizationCode?|caeaId`, `caeExpiration?` }
   - Si `authorizationType=CAE` y **no** se envía `authorizationCode`, el backend consulta AFIP (según config) para obtener CAE y número de comprobante.

## Caja
- POST `/cash/open`
- POST `/cash/close`
- GET `/cash/current`
- GET `/cash/:id/movements`

## Productos y stock
- GET/POST/PUT/DELETE `/products`
- GET/POST `/categories`
- GET `/stock`
- POST `/stock/movement`

## Mesas
- GET/POST/PUT/DELETE `/tables`

## Cocina
- GET `/kitchen`
- POST `/kitchen/send/:saleId`
- PATCH `/kitchen/:id`

## AFIP/CAEA
- GET `/afip/caea`
- POST `/afip/caea`


## Comandas (ADMIN/COCINA)
- GET `/comandas`
- GET `/comandas/:id`
- POST `/comandas` { `saleId`, `status?` }
- PATCH `/comandas/:id/status` { `status`: `PENDIENTE|PREPARANDO|LISTO` }
- DELETE `/comandas/:id`
