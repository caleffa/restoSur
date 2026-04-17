const express = require('express');
const controller = require('./cashReasons.controller');
const { authMiddleware, roleMiddleware } = require('../../middlewares/authMiddleware');

const router = express.Router();
router.use(authMiddleware);

router.get('/cash-reasons', roleMiddleware('ADMIN', 'CAJERO'), controller.listCashReasons);
router.post('/cash-reasons', roleMiddleware('ADMIN'), controller.createCashReason);
router.put('/cash-reasons/:id', roleMiddleware('ADMIN'), controller.updateCashReason);
router.delete('/cash-reasons/:id', roleMiddleware('ADMIN'), controller.deleteCashReason);

module.exports = router;
