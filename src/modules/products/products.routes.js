const express = require('express');
const controller = require('./products.controller');
const { authMiddleware, roleMiddleware } = require('../../middlewares/authMiddleware');

const router = express.Router();
router.use(authMiddleware);

router.get('/products', controller.listProducts);
router.get('/products/top', controller.listTopProducts);
router.get('/products/:id', controller.getProductById);
router.post('/products', roleMiddleware('ADMIN'), controller.createProduct);
router.put('/products/:id', roleMiddleware('ADMIN'), controller.updateProduct);
router.delete('/products/:id', roleMiddleware('ADMIN'), controller.deleteProduct);

module.exports = router;
