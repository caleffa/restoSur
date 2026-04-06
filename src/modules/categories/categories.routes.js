const express = require('express');
const controller = require('./categories.controller');
const { authMiddleware, roleMiddleware } = require('../../middlewares/authMiddleware');

const router = express.Router();
router.use(authMiddleware);

router.get('/categories', controller.listCategories);
router.post('/categories', roleMiddleware('ADMIN'), controller.createCategory);
router.put('/categories/:id', roleMiddleware('ADMIN'), controller.updateCategory);
router.delete('/categories/:id', roleMiddleware('ADMIN'), controller.deleteCategory);

module.exports = router;
