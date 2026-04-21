const express = require('express');
const controller = require('./suppliers.controller');
const { authMiddleware, roleMiddleware } = require('../../middlewares/authMiddleware');

const router = express.Router();
router.use(authMiddleware);

router.get('', controller.listSuppliers);
router.post('', roleMiddleware('ADMIN'), controller.createSupplier);
router.put('/:id', roleMiddleware('ADMIN'), controller.updateSupplier);
router.delete('/:id', roleMiddleware('ADMIN'), controller.deleteSupplier);

module.exports = router;
