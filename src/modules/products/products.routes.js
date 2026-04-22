const express = require('express');
const controller = require('./products.controller');
const { authMiddleware, roleMiddleware } = require('../../middlewares/authMiddleware');

const router = express.Router();
router.use(authMiddleware);

router.get('', controller.listProducts);
router.get('/cost-report', controller.listProductsCostReport);
router.get('/top', controller.listTopProducts);
router.get('/:id', controller.getProductById);
router.post('', roleMiddleware('ADMIN'), controller.createProduct);
router.put('/:id', roleMiddleware('ADMIN'), controller.updateProduct);
router.delete('/:id', roleMiddleware('ADMIN'), controller.deleteProduct);

module.exports = router;
