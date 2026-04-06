const asyncHandler = require('../../middlewares/asyncHandler');
const service = require('./categories.service');

const listCategories = asyncHandler(async (_req, res) => {
  res.json({ ok: true, data: await service.listCategories() });
});

const createCategory = asyncHandler(async (req, res) => {
  const data = await service.createCategory(req.body.name);
  res.status(201).json({ ok: true, data });
});

const updateCategory = asyncHandler(async (req, res) => {
  await service.updateCategory(req.params.id, req.body.name);
  res.json({ ok: true });
});

const deleteCategory = asyncHandler(async (req, res) => {
  await service.removeCategory(req.params.id);
  res.json({ ok: true });
});

module.exports = { listCategories, createCategory, updateCategory, deleteCategory };
