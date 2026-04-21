const express = require('express');
const controller = require('./recipes.controller');
const { authMiddleware, roleMiddleware } = require('../../middlewares/authMiddleware');

const router = express.Router();
router.use(authMiddleware);

router.get('', controller.listRecipes);
router.get('/:id', controller.getRecipeById);
router.post('', roleMiddleware('ADMIN'), controller.createRecipe);
router.put('/:id', roleMiddleware('ADMIN'), controller.updateRecipe);
router.delete('/:id', roleMiddleware('ADMIN'), controller.deleteRecipe);

module.exports = router;
