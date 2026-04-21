const express = require('express');
const controller = require('./tables.controller');
const { authMiddleware, roleMiddleware } = require('../../middlewares/authMiddleware');

const router = express.Router();
router.use(authMiddleware);
router.get('', controller.list);
router.get('/map', roleMiddleware('ADMIN', 'CAJERO', 'MOZO'), controller.getAreaMap);
router.put('/map', roleMiddleware('ADMIN'), controller.saveAreaMap);
router.post('', roleMiddleware('ADMIN'), controller.create);
router.put('/:id', roleMiddleware('ADMIN'), controller.update);
router.put('/:id/status', roleMiddleware('ADMIN', 'MOZO', 'CAJERO'), controller.updateStatus);
router.delete('/:id', roleMiddleware('ADMIN'), controller.remove);

module.exports = router;
