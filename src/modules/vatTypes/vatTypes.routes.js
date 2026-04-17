const express = require('express');
const controller = require('./vatTypes.controller');
const { authMiddleware, roleMiddleware } = require('../../middlewares/authMiddleware');

const router = express.Router();
router.use(authMiddleware);

router.get('/vat-types', controller.listVatTypes);
router.post('/vat-types', roleMiddleware('ADMIN'), controller.createVatType);
router.put('/vat-types/:id', roleMiddleware('ADMIN'), controller.updateVatType);
router.delete('/vat-types/:id', roleMiddleware('ADMIN'), controller.deleteVatType);

module.exports = router;
