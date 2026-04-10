const asyncHandler = require('../../middlewares/asyncHandler');
const service = require('./recipes.service');

const listRecipes = asyncHandler(async (_req, res) => {
  res.json({ ok: true, data: await service.listRecipes() });
});

const getRecipeById = asyncHandler(async (req, res) => {
  res.json({ ok: true, data: await service.getRecipeById(req.params.id) });
});

const createRecipe = asyncHandler(async (req, res) => {
  const data = await service.createRecipe(req.body);
  res.status(201).json({ ok: true, data });
});

const updateRecipe = asyncHandler(async (req, res) => {
  const data = await service.updateRecipe(req.params.id, req.body);
  res.json({ ok: true, data });
});

const deleteRecipe = asyncHandler(async (req, res) => {
  await service.removeRecipe(req.params.id);
  res.json({ ok: true });
});

module.exports = { listRecipes, getRecipeById, createRecipe, updateRecipe, deleteRecipe };
