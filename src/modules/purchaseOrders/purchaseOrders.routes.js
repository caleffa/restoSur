const express = require('express');
const controller = require('./purchaseOrders.controller');
const { authMiddleware, roleMiddleware } = require('../../middlewares/authMiddleware');

const router = express.Router();

router.use(authMiddleware);

router.get('/purchase-orders', roleMiddleware('ADMIN', 'CAJERO'), controller.listPurchaseOrders);
router.get('/purchase-orders/:id', roleMiddleware('ADMIN', 'CAJERO'), controller.getPurchaseOrderById);
router.post('/purchase-orders', roleMiddleware('ADMIN'), controller.createPurchaseOrder);
router.post('/purchase-orders/:id/receipts', roleMiddleware('ADMIN', 'CAJERO'), controller.receivePurchaseOrder);
router.post('/purchase-orders/:id/close', roleMiddleware('ADMIN', 'CAJERO'), controller.closePurchaseOrderWithDifferences);

module.exports = router;
