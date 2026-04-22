const express = require('express');
const controller = require('./profits.controller');
const { authMiddleware, roleMiddleware } = require('../../middlewares/authMiddleware');

const router = express.Router();

router.use(authMiddleware);
router.get('/report', roleMiddleware('ADMIN', 'CAJERO'), controller.getReport);

module.exports = router;
