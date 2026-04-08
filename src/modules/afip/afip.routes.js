const express = require('express');
const controller = require('./afip.controller');
const { authMiddleware, roleMiddleware } = require('../../middlewares/authMiddleware');

const router = express.Router();
router.use(authMiddleware);

router.get('/afip/config', roleMiddleware('ADMIN', 'CAJERO'), controller.getConfig);
router.put('/afip/config', roleMiddleware('ADMIN'), controller.upsertConfig);

router.get('/afip/caea', roleMiddleware('ADMIN', 'CAJERO'), controller.list);
router.post('/afip/caea', roleMiddleware('ADMIN', 'CAJERO'), controller.create);
router.post('/afip/caea/request', roleMiddleware('ADMIN', 'CAJERO'), controller.request);

module.exports = router;
