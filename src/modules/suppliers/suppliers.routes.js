const express = require('express');
const controller = require('./suppliers.controller');
const { authMiddleware, roleMiddleware } = require('../../middlewares/authMiddleware');

const router = express.Router();
router.use(authMiddleware);

router.get('/suppliers', controller.listSuppliers);
router.post('/suppliers', roleMiddleware('ADMIN'), controller.createSupplier);
router.put('/suppliers/:id', roleMiddleware('ADMIN'), controller.updateSupplier);
router.delete('/suppliers/:id', roleMiddleware('ADMIN'), controller.deleteSupplier);

module.exports = router;
