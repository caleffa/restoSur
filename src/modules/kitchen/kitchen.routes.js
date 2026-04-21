const express = require('express');
const controller = require('./kitchen.controller');
const { authMiddleware, roleMiddleware } = require('../../middlewares/authMiddleware');

const router = express.Router();
router.use(authMiddleware);

router.get('', roleMiddleware('ADMIN', 'COCINA', 'CAJERO', 'MOZO'), controller.list);
router.get('/orders', roleMiddleware('ADMIN', 'COCINA', 'CAJERO', 'MOZO'), controller.listOrdersByTable);
router.post('/orders', roleMiddleware('ADMIN', 'CAJERO', 'MOZO'), controller.createOrder);
router.post('/send/:saleId', roleMiddleware('ADMIN', 'MOZO', 'CAJERO'), controller.send);
router.patch('/:id', roleMiddleware('ADMIN', 'COCINA'), controller.update);

module.exports = router;
