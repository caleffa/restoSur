const express = require('express');
const controller = require('./cash.controller');
const { authMiddleware, roleMiddleware } = require('../../middlewares/authMiddleware');

const router = express.Router();
router.use(authMiddleware);

router.get('/cash-registers', roleMiddleware('ADMIN', 'CAJERO'), controller.listRegisters);
router.post('/cash-registers', roleMiddleware('ADMIN'), controller.createRegister);
router.put('/cash-registers/:id', roleMiddleware('ADMIN'), controller.updateRegister);
router.delete('/cash-registers/:id', roleMiddleware('ADMIN'), controller.deleteRegister);

router.post('/cash/open', roleMiddleware('ADMIN', 'CAJERO'), controller.open);
router.post('/cash/close', roleMiddleware('ADMIN', 'CAJERO'), controller.close);
router.get('/cash/current', roleMiddleware('ADMIN', 'CAJERO'), controller.current);
router.get('/cash/movements', roleMiddleware('ADMIN', 'CAJERO'), controller.movements);
router.get('/cash/:id/movements', roleMiddleware('ADMIN', 'CAJERO'), controller.movements);
router.post('/cash/income', roleMiddleware('ADMIN', 'CAJERO'), controller.income);
router.post('/cash/expense', roleMiddleware('ADMIN', 'CAJERO'), controller.expense);
router.post('/cash/register-sale', roleMiddleware('ADMIN', 'CAJERO', 'MOZO'), controller.registerSale);

router.get('/cash/shifts', roleMiddleware('ADMIN', 'CAJERO'), controller.shifts);
router.get('/cash/shifts/:id', roleMiddleware('ADMIN', 'CAJERO'), controller.shiftById);

router.get('/cash/reports', roleMiddleware('ADMIN', 'CAJERO'), controller.reports);

module.exports = router;
