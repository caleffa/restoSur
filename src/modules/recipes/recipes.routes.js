const express = require('express');
const controller = require('./recipes.controller');
const { authMiddleware, roleMiddleware } = require('../../middlewares/authMiddleware');

const router = express.Router();
router.use(authMiddleware);

router.get('/recipes', controller.listRecipes);
router.get('/recipes/:id', controller.getRecipeById);
router.post('/recipes', roleMiddleware('ADMIN'), controller.createRecipe);
router.put('/recipes/:id', roleMiddleware('ADMIN'), controller.updateRecipe);
router.delete('/recipes/:id', roleMiddleware('ADMIN'), controller.deleteRecipe);

module.exports = router;
