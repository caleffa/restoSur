const express = require('express');
const controller = require('./invoices.controller');
const { authMiddleware, roleMiddleware } = require('../../middlewares/authMiddleware');

const router = express.Router();
router.use(authMiddleware);
router.post('/invoices', roleMiddleware('ADMIN', 'CAJERO'), controller.create);
router.get('/invoices', roleMiddleware('ADMIN', 'CAJERO'), controller.list);

module.exports = router;
