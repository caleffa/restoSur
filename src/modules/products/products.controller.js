const asyncHandler = require('../../middlewares/asyncHandler');
const service = require('./products.service');

const listProducts = asyncHandler(async (_req, res) => res.json({ ok: true, data: await service.listProducts() }));
const getProductById = asyncHandler(async (req, res) =>
  res.json({ ok: true, data: await service.getProductById(Number(req.params.id)) })
);
const createProduct = asyncHandler(async (req, res) =>
  res.status(201).json({ ok: true, data: await service.createProduct(req.body) })
);
const updateProduct = asyncHandler(async (req, res) => {
  await service.updateProduct(Number(req.params.id), req.body);
  res.json({ ok: true });
});
const deleteProduct = asyncHandler(async (req, res) => {
  await service.removeProduct(Number(req.params.id));
  res.json({ ok: true });
});

const listTopProducts = asyncHandler(async (req, res) =>
  res.json({ ok: true, data: await service.listTopProducts(Number(req.user.branchId)) })
);

module.exports = { listProducts, getProductById, createProduct, updateProduct, deleteProduct, listTopProducts };
