const express = require('express');
const controller = require('./kitchen.controller');
const { authMiddleware, roleMiddleware } = require('../../middlewares/authMiddleware');

const router = express.Router();
router.use(authMiddleware);

router.get('/kitchen', roleMiddleware('ADMIN', 'COCINA', 'CAJERO'), controller.list);
router.get('/kitchen/orders', roleMiddleware('ADMIN', 'COCINA', 'CAJERO', 'MOZO'), controller.listOrdersByTable);
router.post('/kitchen/orders', roleMiddleware('ADMIN', 'CAJERO', 'MOZO'), controller.createOrder);
router.post('/kitchen/send/:saleId', roleMiddleware('ADMIN', 'MOZO', 'CAJERO'), controller.send);
router.patch('/kitchen/:id', roleMiddleware('ADMIN', 'COCINA'), controller.update);

module.exports = router;
