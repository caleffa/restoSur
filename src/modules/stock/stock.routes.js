const express = require('express');
const controller = require('./stock.controller');
const { authMiddleware, roleMiddleware } = require('../../middlewares/authMiddleware');

const router = express.Router();
router.use(authMiddleware);

router.get('', controller.list);
router.get('/movements', controller.listMovements);
router.post('/movement', roleMiddleware('ADMIN', 'CAJERO'), controller.movement);

module.exports = router;
