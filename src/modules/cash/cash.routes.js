const express = require('express');
const controller = require('./cash.controller');
const { authMiddleware, roleMiddleware } = require('../../middlewares/authMiddleware');

const router = express.Router();
router.use(authMiddleware);

router.post('/cash/open', roleMiddleware('ADMIN', 'CAJERO'), controller.open);
router.post('/cash/close', roleMiddleware('ADMIN', 'CAJERO'), controller.close);
router.get('/cash/current', roleMiddleware('ADMIN', 'CAJERO'), controller.current);
router.get('/cash/:id/movements', roleMiddleware('ADMIN', 'CAJERO'), controller.movements);

module.exports = router;
