const express = require('express');
const controller = require('./sales.controller');
const { authMiddleware, roleMiddleware } = require('../../middlewares/authMiddleware');

const router = express.Router();
router.use(authMiddleware);

router.post('/', roleMiddleware('ADMIN', 'MOZO', 'CAJERO'), controller.createSale);
router.get('/open', roleMiddleware('ADMIN', 'MOZO', 'CAJERO', 'COCINA'), controller.listOpen);
router.get('/:id', roleMiddleware('ADMIN', 'MOZO', 'CAJERO', 'COCINA'), controller.getById);
router.post('/:id/items', roleMiddleware('ADMIN', 'MOZO', 'CAJERO'), controller.addItem);
router.post('/:id/pay', roleMiddleware('ADMIN', 'CAJERO'), controller.paySale);

module.exports = router;
