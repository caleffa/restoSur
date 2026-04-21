const express = require('express');
const controller = require('./purchaseOrders.controller');
const { authMiddleware, roleMiddleware } = require('../../middlewares/authMiddleware');

const router = express.Router();

router.use(authMiddleware);

router.get('', roleMiddleware('ADMIN', 'CAJERO'), controller.listPurchaseOrders);
router.get('/:id', roleMiddleware('ADMIN', 'CAJERO'), controller.getPurchaseOrderById);
router.post('', roleMiddleware('ADMIN'), controller.createPurchaseOrder);
router.post('/:id/receipts', roleMiddleware('ADMIN', 'CAJERO'), controller.receivePurchaseOrder);
router.post('/:id/close', roleMiddleware('ADMIN', 'CAJERO'), controller.closePurchaseOrderWithDifferences);

module.exports = router;
