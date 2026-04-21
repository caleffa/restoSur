const express = require('express');
const controller = require('./cashReasons.controller');
const { authMiddleware, roleMiddleware } = require('../../middlewares/authMiddleware');

const router = express.Router();
router.use(authMiddleware);

router.get('', roleMiddleware('ADMIN', 'CAJERO'), controller.listCashReasons);
router.post('', roleMiddleware('ADMIN'), controller.createCashReason);
router.put('/:id', roleMiddleware('ADMIN'), controller.updateCashReason);
router.delete('/:id', roleMiddleware('ADMIN'), controller.deleteCashReason);

module.exports = router;
