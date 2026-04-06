const express = require('express');
const controller = require('./dashboard.controller');
const { authMiddleware, roleMiddleware } = require('../../middlewares/authMiddleware');

const router = express.Router();
router.use(authMiddleware);

router.get('/dashboard/summary', roleMiddleware('ADMIN', 'MOZO', 'CAJERO', 'COCINA'), controller.getSummary);
router.get('/dashboard/sales-by-hour', roleMiddleware('ADMIN', 'MOZO', 'CAJERO', 'COCINA'), controller.getSalesByHour);

module.exports = router;
