const express = require('express');
const controller = require('./products.controller');
const { authMiddleware, roleMiddleware } = require('../../middlewares/authMiddleware');

const router = express.Router();
router.use(authMiddleware);

router.get('/products', controller.listProducts);
router.post('/products', roleMiddleware('ADMIN'), controller.createProduct);
router.put('/products/:id', roleMiddleware('ADMIN'), controller.updateProduct);
router.delete('/products/:id', roleMiddleware('ADMIN'), controller.deleteProduct);

router.get('/categories', controller.listCategories);
router.post('/categories', roleMiddleware('ADMIN'), controller.createCategory);

module.exports = router;
