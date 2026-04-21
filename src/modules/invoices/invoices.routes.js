const express = require('express');
const controller = require('./invoices.controller');
const { authMiddleware, roleMiddleware } = require('../../middlewares/authMiddleware');

const router = express.Router();
router.use(authMiddleware);
router.post('', roleMiddleware('ADMIN', 'CAJERO'), controller.create);
router.get('', roleMiddleware('ADMIN', 'CAJERO'), controller.list);

module.exports = router;
