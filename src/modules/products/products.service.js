const repo = require('./products.repository');
const AppError = require('../../utils/appError');

function normalizeProductPayload(data) {
  if (!data.name || !data.categoryId || data.price === undefined) {
    throw new AppError('name, categoryId y price son obligatorios', 400);
  }

  const categoryId = Number(data.categoryId);
  const price = Number(data.price);
  if (!categoryId || categoryId <= 0) {
    throw new AppError('categoryId inválido', 400);
  }
  if (!Number.isFinite(price) || price < 0) {
    throw new AppError('price inválido', 400);
  }

  return {
    categoryId,
    name: String(data.name).trim(),
    price,
    hasStock: data.hasStock === undefined ? true : Boolean(data.hasStock),
    active: data.active === undefined ? true : Boolean(data.active),
  };
}

async function listProducts() {
  return repo.listProducts();
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

module.exports = { listProducts, getProductById, createProduct, updateProduct, removeProduct };
