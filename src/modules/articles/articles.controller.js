const asyncHandler = require('../../middlewares/asyncHandler');
const service = require('./articles.service');

const listArticles = asyncHandler(async (_req, res) => {
  res.json({ ok: true, data: await service.listArticles() });
});

const getArticleById = asyncHandler(async (req, res) => {
  res.json({ ok: true, data: await service.getArticleById(req.params.id) });
});

const createArticle = asyncHandler(async (req, res) => {
  const data = await service.createArticle(req.body);
  res.status(201).json({ ok: true, data });
});

const updateArticle = asyncHandler(async (req, res) => {
  await service.updateArticle(req.params.id, req.body);
  res.json({ ok: true });
});

const deleteArticle = asyncHandler(async (req, res) => {
  await service.removeArticle(req.params.id);
  res.json({ ok: true });
});

module.exports = { listArticles, getArticleById, createArticle, updateArticle, deleteArticle };
