const asyncHandler = require('../../middlewares/asyncHandler');
const service = require('./articleTypes.service');

const listArticleTypes = asyncHandler(async (_req, res) => {
  res.json({ ok: true, data: await service.listArticleTypes() });
});

const createArticleType = asyncHandler(async (req, res) => {
  const data = await service.createArticleType(req.body);
  res.status(201).json({ ok: true, data });
});

const updateArticleType = asyncHandler(async (req, res) => {
  await service.updateArticleType(req.params.id, req.body);
  res.json({ ok: true });
});

const deleteArticleType = asyncHandler(async (req, res) => {
  await service.removeArticleType(req.params.id);
  res.json({ ok: true });
});

module.exports = { listArticleTypes, createArticleType, updateArticleType, deleteArticleType };
