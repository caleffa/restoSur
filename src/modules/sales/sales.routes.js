const express = require('express');
const controller = require('./sales.controller');
const { authMiddleware, roleMiddleware } = require('../../middlewares/authMiddleware');

const router = express.Router();
router.use(authMiddleware); 

router.post('/', roleMiddleware('ADMIN', 'MOZO', 'CAJERO'), controller.createSale);
router.get('/waiters', roleMiddleware('ADMIN', 'MOZO', 'CAJERO', 'COCINA'), controller.listWaiters);
router.get('/reports', roleMiddleware('ADMIN', 'CAJERO'), controller.report);
router.get('/reports/export', roleMiddleware('ADMIN', 'CAJERO'), controller.exportReport);
router.get('/reports/vat-book', roleMiddleware('ADMIN', 'CAJERO'), controller.vatBook);
router.get('/open', roleMiddleware('ADMIN', 'MOZO', 'CAJERO', 'COCINA'), controller.listOpen);
router.get('/table/:tableId', roleMiddleware('ADMIN', 'MOZO', 'CAJERO', 'COCINA'), controller.getByTable);
router.get('/:id', roleMiddleware('ADMIN', 'MOZO', 'CAJERO', 'COCINA'), controller.getById);

router.put('/:id/waiter', roleMiddleware('ADMIN', 'MOZO', 'CAJERO'), controller.reassignWaiter);
router.post('/:id/items', roleMiddleware('ADMIN', 'MOZO', 'CAJERO'), controller.addItem);
router.put('/items/:itemId', roleMiddleware('ADMIN', 'MOZO', 'CAJERO'), controller.updateItem);

router.delete('/items/:itemId', roleMiddleware('ADMIN', 'MOZO', 'CAJERO'), controller.deleteItem);

router.post('/:id/request-bill', roleMiddleware('ADMIN', 'MOZO', 'CAJERO'), controller.requestBill);
router.post('/:id/pay', roleMiddleware('ADMIN', 'CAJERO'), controller.paySale);
router.post('/:id/close', roleMiddleware('ADMIN', 'CAJERO'), controller.closeSale);
router.post('/:id/cancel', roleMiddleware('ADMIN', 'MOZO', 'CAJERO'), controller.cancelSale);

module.exports = router; 
