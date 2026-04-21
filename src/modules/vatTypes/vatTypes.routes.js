const express = require('express');
const controller = require('./vatTypes.controller');
const { authMiddleware, roleMiddleware } = require('../../middlewares/authMiddleware');

const router = express.Router();
router.use(authMiddleware);

router.get('', controller.listVatTypes);
router.post('', roleMiddleware('ADMIN'), controller.createVatType);
router.put('/:id', roleMiddleware('ADMIN'), controller.updateVatType);
router.delete('/:id', roleMiddleware('ADMIN'), controller.deleteVatType);

module.exports = router;
