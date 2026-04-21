const express = require('express');
const controller = require('./cash.controller');
const { authMiddleware, roleMiddleware } = require('../../middlewares/authMiddleware');

const router = express.Router(); 
router.use(authMiddleware);

router.post('/open', roleMiddleware('ADMIN', 'CAJERO'), controller.open);
router.post('/close', roleMiddleware('ADMIN', 'CAJERO'), controller.close);
router.get('/current', roleMiddleware('ADMIN', 'CAJERO'), controller.current);
router.get('/movements', roleMiddleware('ADMIN', 'CAJERO'), controller.movements);
router.get('/:id/movements', roleMiddleware('ADMIN', 'CAJERO'), controller.movements);
router.post('/income', roleMiddleware('ADMIN', 'CAJERO'), controller.income);
router.post('/expense', roleMiddleware('ADMIN', 'CAJERO'), controller.expense);
router.post('/register-sale', roleMiddleware('ADMIN', 'CAJERO'), controller.registerSale);

router.get('/shifts', roleMiddleware('ADMIN', 'CAJERO'), controller.shifts);
router.get('/shifts/:id', roleMiddleware('ADMIN', 'CAJERO'), controller.shiftById);

router.get('/reports', roleMiddleware('ADMIN', 'CAJERO'), controller.reports);

module.exports = router;
