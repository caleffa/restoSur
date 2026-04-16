const express = require('express');
const controller = require('./kitchenTypes.controller');
const { authMiddleware, roleMiddleware } = require('../../middlewares/authMiddleware');

const router = express.Router();
router.use(authMiddleware);

router.get('/kitchen-types', controller.listKitchenTypes);
router.post('/kitchen-types', roleMiddleware('ADMIN'), controller.createKitchenType);
router.put('/kitchen-types/:id', roleMiddleware('ADMIN'), controller.updateKitchenType);
router.delete('/kitchen-types/:id', roleMiddleware('ADMIN'), controller.deleteKitchenType);

module.exports = router;
