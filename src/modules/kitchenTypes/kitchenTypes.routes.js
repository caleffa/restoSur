const express = require('express');
const controller = require('./kitchenTypes.controller');
const { authMiddleware, roleMiddleware } = require('../../middlewares/authMiddleware');

const router = express.Router();
router.use(authMiddleware);

router.get('', controller.listKitchenTypes);
router.post('', roleMiddleware('ADMIN'), controller.createKitchenType);
router.put('/:id', roleMiddleware('ADMIN'), controller.updateKitchenType);
router.delete('/:id', roleMiddleware('ADMIN'), controller.deleteKitchenType);

module.exports = router;
