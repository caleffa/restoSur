const express = require('express');
const controller = require('./stock.controller');
const { authMiddleware, roleMiddleware } = require('../../middlewares/authMiddleware');

const router = express.Router();
router.use(authMiddleware);

router.get('/stock', controller.list);
router.post('/stock/movement', roleMiddleware('ADMIN', 'CAJERO'), controller.movement);

module.exports = router;
