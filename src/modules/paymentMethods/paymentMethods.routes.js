const express = require('express');
const controller = require('./paymentMethods.controller');
const { authMiddleware, roleMiddleware } = require('../../middlewares/authMiddleware');

const router = express.Router();
router.use(authMiddleware);

router.get('', roleMiddleware('ADMIN', 'CAJERO'), controller.listPaymentMethods);
router.post('', roleMiddleware('ADMIN'), controller.createPaymentMethod);
router.put('/:id', roleMiddleware('ADMIN'), controller.updatePaymentMethod);
router.delete('/:id', roleMiddleware('ADMIN'), controller.deletePaymentMethod);

module.exports = router;
