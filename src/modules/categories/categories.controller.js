const asyncHandler = require('../../middlewares/asyncHandler');
const service = require('./categories.service');

const listCategories = asyncHandler(async (_req, res) => {
  res.json({ ok: true, data: await service.listCategories() });
});

const createCategory = asyncHandler(async (req, res) => {
  const imageFile = req.body.imageData ? { dataUrl: req.body.imageData, originalName: req.body.imageName } : null;
  const data = await service.createCategory(req.body.name, imageFile);
  res.status(201).json({ ok: true, data });
});

const updateCategory = asyncHandler(async (req, res) => {
  const imageFile = req.body.imageData ? { dataUrl: req.body.imageData, originalName: req.body.imageName } : null;
  const removeImage = req.body.removeImage === true || req.body.removeImage === 'true';
  await service.updateCategory(req.params.id, req.body.name, { imageFile, removeImage });
  res.json({ ok: true });
});

const deleteCategory = asyncHandler(async (req, res) => {
  await service.removeCategory(req.params.id);
  res.json({ ok: true });
});

module.exports = { listCategories, createCategory, updateCategory, deleteCategory };
