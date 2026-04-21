const express = require('express');
const controller = require('./kitchens.controller');
const { authMiddleware, roleMiddleware } = require('../../middlewares/authMiddleware');

const router = express.Router();
router.use(authMiddleware);

router.get('', controller.listKitchens);
router.post('', roleMiddleware('ADMIN'), controller.createKitchen);
router.put('/:id', roleMiddleware('ADMIN'), controller.updateKitchen);
router.delete('/:id', roleMiddleware('ADMIN'), controller.deleteKitchen);

module.exports = router;
