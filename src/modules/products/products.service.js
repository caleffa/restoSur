const repo = require('./products.repository');
const AppError = require('../../utils/appError');

function normalizeProductPayload(data) {
  if (!data.name || !data.categoryId || data.price === undefined) {
    throw new AppError('name, categoryId y price son obligatorios', 400);
  }

  const categoryId = Number(data.categoryId);
  const price = Number(data.price);
  if (!categoryId || categoryId <= 0) throw new AppError('categoryId inválido', 400);
  if (!Number.isFinite(price) || price < 0) throw new AppError('price inválido', 400);

  return {
    categoryId,
    name: String(data.name).trim(),
    price,
    hasStock: data.hasStock === undefined ? true : Boolean(data.hasStock),
    forSale: data.forSale === undefined ? true : Boolean(data.forSale),
    active: data.active === undefined ? true : Boolean(data.active),
    sku: String(data.sku || `PROD-${Date.now()}`).trim().toUpperCase(),
    articleTypeId: Number(data.articleTypeId || 1),
    measurementUnitId: Number(data.measurementUnitId || 1),
    cost: Number(data.cost || 0),
  };
}

async function listProducts() {
  return repo.listSaleProducts();
}

async function listProductsCostReport() {
  return repo.listCostReport();
}

async function getProductById(id) {
  if (!id || id <= 0) throw new AppError('ID de producto inválido', 400);
  const product = await repo.findById(id);
  if (!product) throw new AppError('Producto no encontrado', 404);
  return product;
}

async function createProduct(data) {
  const payload = normalizeProductPayload(data);
  return repo.createProduct(payload);
}

async function updateProduct(id, data) {
  if (!id || id <= 0) throw new AppError('ID de producto inválido', 400);
  const current = await repo.findById(id);
  if (!current) throw new AppError('Producto no encontrado', 404);
  const payload = normalizeProductPayload(data);
  await repo.updateProduct(id, payload);
}

async function removeProduct(id) {
  if (!id || id <= 0) throw new AppError('ID de producto inválido', 400);
  const current = await repo.findById(id);
  if (!current) throw new AppError('Producto no encontrado', 404);
  await repo.removeProduct(id);
}

async function listTopProducts(branchId) {
  if (!branchId || branchId <= 0) throw new AppError('Sucursal inválida', 400);
  return repo.listTopProductsByBranch(branchId, 8);
}

module.exports = {
  listProducts,
  listProductsCostReport,
  getProductById,
  createProduct,
  updateProduct,
  removeProduct,
  listTopProducts,
};
