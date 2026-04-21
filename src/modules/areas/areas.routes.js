const express = require('express');
const controller = require('./areas.controller');
const { authMiddleware, roleMiddleware } = require('../../middlewares/authMiddleware');

const router = express.Router();
router.use(authMiddleware);

router.get('', controller.listAreas);
router.post('', roleMiddleware('ADMIN'), controller.createArea);
router.put('/:id', roleMiddleware('ADMIN'), controller.updateArea);
router.delete('/:id', roleMiddleware('ADMIN'), controller.deleteArea);

module.exports = router;
