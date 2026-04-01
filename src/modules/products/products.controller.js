const asyncHandler = require('../../middlewares/asyncHandler');
const service = require('./products.service');

const listProducts = asyncHandler(async (_req, res) => res.json({ ok: true, data: await service.listProducts() }));
const createProduct = asyncHandler(async (req, res) => res.status(201).json({ ok: true, data: await service.createProduct(req.body) }));
const updateProduct = asyncHandler(async (req, res) => {
  await service.updateProduct(Number(req.params.id), req.body);
  res.json({ ok: true });
});
const deleteProduct = asyncHandler(async (req, res) => {
  await service.removeProduct(Number(req.params.id));
  res.json({ ok: true });
});
const listCategories = asyncHandler(async (_req, res) => res.json({ ok: true, data: await service.listCategories() }));
const createCategory = asyncHandler(async (req, res) =>
  res.status(201).json({ ok: true, data: await service.createCategory(req.body.name) })
);

module.exports = { listProducts, createProduct, updateProduct, deleteProduct, listCategories, createCategory };
