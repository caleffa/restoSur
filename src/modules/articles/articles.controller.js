const asyncHandler = require('../../middlewares/asyncHandler');
const service = require('./articles.service');

const listArticles = asyncHandler(async (req, res) => {
  res.json({ ok: true, data: await service.listArticles(req.query) });
});

const getArticleById = asyncHandler(async (req, res) => {
  res.json({ ok: true, data: await service.getArticleById(req.params.id) });
});

const createArticle = asyncHandler(async (req, res) => {
  const data = await service.createArticle(req.body);
  res.status(201).json({ ok: true, data });
});

const importArticlesFromCsv = asyncHandler(async (req, res) => {
  const data = await service.importArticlesFromCsv(req.body?.csv);
  res.status(201).json({ ok: true, data });
});

const downloadImportTemplate = asyncHandler(async (req, res) => {
  const csv = await service.generateImportTemplateCsv();
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="articulos-import-template.csv"');
  res.status(200).send(csv);
});

const updateArticle = asyncHandler(async (req, res) => {
  await service.updateArticle(req.params.id, req.body);
  res.json({ ok: true });
});

const deleteArticle = asyncHandler(async (req, res) => {
  await service.removeArticle(req.params.id);
  res.json({ ok: true });
});

module.exports = {
  listArticles,
  getArticleById,
  createArticle,
  importArticlesFromCsv,
  downloadImportTemplate,
  updateArticle,
  deleteArticle,
};
