const express = require('express');
const controller = require('./afip.controller');
const { authMiddleware, roleMiddleware } = require('../../middlewares/authMiddleware');

const router = express.Router();
router.use(authMiddleware);

router.get('/config', roleMiddleware('ADMIN', 'CAJERO'), controller.getConfig);
router.put('/config', roleMiddleware('ADMIN'), controller.upsertConfig);

router.get('/caea', roleMiddleware('ADMIN', 'CAJERO'), controller.list);
router.post('/caea', roleMiddleware('ADMIN', 'CAJERO'), controller.create);
router.post('/caea/request', roleMiddleware('ADMIN', 'CAJERO'), controller.request);

module.exports = router;
