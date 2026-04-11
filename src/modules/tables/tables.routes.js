const express = require('express');
const controller = require('./tables.controller');
const { authMiddleware, roleMiddleware } = require('../../middlewares/authMiddleware');

const router = express.Router();
router.use(authMiddleware);
router.get('/tables', controller.list);
router.get('/tables/map', roleMiddleware('ADMIN', 'CAJERO', 'MOZO'), controller.getAreaMap);
router.put('/tables/map', roleMiddleware('ADMIN'), controller.saveAreaMap);
router.post('/tables', roleMiddleware('ADMIN'), controller.create);
router.put('/tables/:id', roleMiddleware('ADMIN'), controller.update);
router.put('/tables/:id/status', roleMiddleware('ADMIN', 'MOZO', 'CAJERO'), controller.updateStatus);
router.delete('/tables/:id', roleMiddleware('ADMIN'), controller.remove);

module.exports = router;
