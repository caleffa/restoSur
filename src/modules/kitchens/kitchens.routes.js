const express = require('express');
const controller = require('./kitchens.controller');
const { authMiddleware, roleMiddleware } = require('../../middlewares/authMiddleware');

const router = express.Router();
router.use(authMiddleware);

router.get('/kitchens', controller.listKitchens);
router.post('/kitchens', roleMiddleware('ADMIN'), controller.createKitchen);
router.put('/kitchens/:id', roleMiddleware('ADMIN'), controller.updateKitchen);
router.delete('/kitchens/:id', roleMiddleware('ADMIN'), controller.deleteKitchen);

module.exports = router;
