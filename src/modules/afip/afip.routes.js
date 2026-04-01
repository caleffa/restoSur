const express = require('express');
const controller = require('./afip.controller');
const { authMiddleware, roleMiddleware } = require('../../middlewares/authMiddleware');

const router = express.Router();
router.use(authMiddleware);

router.get('/afip/caea', roleMiddleware('ADMIN', 'CAJERO'), controller.list);
router.post('/afip/caea', roleMiddleware('ADMIN', 'CAJERO'), controller.create);

module.exports = router;
