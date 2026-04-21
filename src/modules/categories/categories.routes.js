const express = require('express');
const controller = require('./categories.controller');
const { authMiddleware, roleMiddleware } = require('../../middlewares/authMiddleware');

const router = express.Router();
router.use(authMiddleware);

router.get('', controller.listCategories);
router.post('', roleMiddleware('ADMIN'), controller.createCategory);
router.put('/:id', roleMiddleware('ADMIN'), controller.updateCategory);
router.delete('/:id', roleMiddleware('ADMIN'), controller.deleteCategory);

module.exports = router;
