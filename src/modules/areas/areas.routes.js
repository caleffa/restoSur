const express = require('express');
const controller = require('./areas.controller');
const { authMiddleware, roleMiddleware } = require('../../middlewares/authMiddleware');

const router = express.Router();
router.use(authMiddleware);

router.get('/areas', controller.listAreas);
router.post('/areas', roleMiddleware('ADMIN'), controller.createArea);
router.put('/areas/:id', roleMiddleware('ADMIN'), controller.updateArea);
router.delete('/areas/:id', roleMiddleware('ADMIN'), controller.deleteArea);

module.exports = router;
