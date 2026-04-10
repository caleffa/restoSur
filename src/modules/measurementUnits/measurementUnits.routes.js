const express = require('express');
const controller = require('./measurementUnits.controller');
const { authMiddleware, roleMiddleware } = require('../../middlewares/authMiddleware');

const router = express.Router();
router.use(authMiddleware);

router.get('/measurement-units', controller.listMeasurementUnits);
router.post('/measurement-units', roleMiddleware('ADMIN'), controller.createMeasurementUnit);
router.put('/measurement-units/:id', roleMiddleware('ADMIN'), controller.updateMeasurementUnit);
router.delete('/measurement-units/:id', roleMiddleware('ADMIN'), controller.deleteMeasurementUnit);

module.exports = router;
