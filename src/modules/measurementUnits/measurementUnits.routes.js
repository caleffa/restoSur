const express = require('express');
const controller = require('./measurementUnits.controller');
const { authMiddleware, roleMiddleware } = require('../../middlewares/authMiddleware');

const router = express.Router();
router.use(authMiddleware);

router.get('', controller.listMeasurementUnits);
router.post('', roleMiddleware('ADMIN'), controller.createMeasurementUnit);
router.put('/:id', roleMiddleware('ADMIN'), controller.updateMeasurementUnit);
router.delete('/:id', roleMiddleware('ADMIN'), controller.deleteMeasurementUnit);

module.exports = router;
