const express = require('express');
const controller = require('./dashboard.controller');
const { authMiddleware, roleMiddleware } = require('../../middlewares/authMiddleware');

const router = express.Router();
router.use(authMiddleware);

router.get('/summary', roleMiddleware('ADMIN', 'MOZO', 'CAJERO', 'COCINA'), controller.getSummary);
router.get('/sales-by-hour', roleMiddleware('ADMIN', 'MOZO', 'CAJERO', 'COCINA'), controller.getSalesByHour);
router.get('/waiter', roleMiddleware('MOZO'), controller.getWaiterDashboard);

module.exports = router;
