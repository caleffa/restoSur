const repo = require('./articles.repository');
const articleTypeRepo = require('../articleTypes/articleTypes.repository');
const measurementUnitRepo = require('../measurementUnits/measurementUnits.repository');
const categoriesRepo = require('../categories/categories.repository');
const AppError = require('../../utils/appError');

function toOptionalNumber(value) {
  if (value === undefined || value === null || value === '') return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function normalizePayload(data) {
  const name = String(data.name || '').trim();
  const sku = String(data.sku || '').trim().toUpperCase();
  const barcode = data.barcode ? String(data.barcode).trim() : null;
  const articleTypeId = Number(data.articleTypeId);
  const measurementUnitId = Number(data.measurementUnitId);
  const categoryId = toOptionalNumber(data.categoryId);
  const cost = Number(data.cost);
  const salePrice = Number(data.salePrice ?? data.price ?? 0);

  if (!name) throw new AppError('El nombre del artículo es obligatorio', 400);
  if (!sku) throw new AppError('El SKU del artículo es obligatorio', 400);
  if (!articleTypeId) throw new AppError('El tipo de artículo es obligatorio', 400);
  if (!measurementUnitId) throw new AppError('La unidad de medida es obligatoria', 400);
  if (!Number.isFinite(cost) || cost < 0) throw new AppError('El costo del artículo es inválido', 400);
  if (!Number.isFinite(salePrice) || salePrice < 0) throw new AppError('El precio de venta es inválido', 400);

  const isProduct = data.isProduct === undefined ? false : Boolean(data.isProduct);
  const isSupply = data.isSupply === undefined ? false : Boolean(data.isSupply);
  const forSale = data.forSale === undefined ? false : Boolean(data.forSale);

  if (isProduct && isSupply) {
    throw new AppError('Un artículo no puede ser producto e insumo al mismo tiempo', 400);
  }

  if (isSupply && forSale) {
    throw new AppError('Un insumo no puede estar a la venta', 400);
  }


  return {
    name,
    sku,
    barcode,
    articleTypeId,
    measurementUnitId,
    categoryId,
    cost,
    salePrice,
    managesStock: data.managesStock === undefined ? true : Boolean(data.managesStock),
    isProduct,
    isSupply,
    forSale,
    active: data.active === undefined ? true : Boolean(data.active),
  };
}

async function validateReferences(data) {
  const [articleType, measurementUnit, category] = await Promise.all([
    articleTypeRepo.findById(data.articleTypeId),
    measurementUnitRepo.findById(data.measurementUnitId),
    data.categoryId ? categoriesRepo.findById(data.categoryId) : Promise.resolve(null),
  ]);

  if (!articleType) throw new AppError('Tipo de artículo no encontrado', 404);
  if (!measurementUnit) throw new AppError('Unidad de medida no encontrada', 404);
  if (data.categoryId && !category) throw new AppError('Categoría no encontrada', 404);
}

async function ensureUniqueFields(data, currentId = null) {
  const existingSku = await repo.findBySku(data.sku);
  if (existingSku && existingSku.id !== currentId) {
    throw new AppError('Ya existe un artículo con ese SKU', 409);
  }

  if (data.barcode) {
    const existingBarcode = await repo.findByBarcode(data.barcode);
    if (existingBarcode && existingBarcode.id !== currentId) {
      throw new AppError('Ya existe un artículo con ese código de barras', 409);
    }
  }
}

function normalizeListFilters(query) {
  const parseBool = (value) => {
    if (value === undefined) return undefined;
    return ['1', 'true', 'si', 'yes'].includes(String(value).toLowerCase());
  };

  return {
    isProduct: parseBool(query.isProduct),
    isSupply: parseBool(query.isSupply),
    forSale: parseBool(query.forSale),
  };
}

async function listArticles(filters = {}) {
  return repo.list(normalizeListFilters(filters));
}

async function getArticleById(id) {
  const articleId = Number(id);
  if (!articleId) throw new AppError('ID de artículo inválido', 400);

  const article = await repo.findById(articleId);
  if (!article) throw new AppError('Artículo no encontrado', 404);
  return article;
}

async function createArticle(data) {
  const payload = normalizePayload(data);
  await validateReferences(payload);
  await ensureUniqueFields(payload);
  return repo.create(payload);
}

async function updateArticle(id, data) {
  const articleId = Number(id);
  if (!articleId) throw new AppError('ID de artículo inválido', 400);

  const current = await repo.findById(articleId);
  if (!current) throw new AppError('Artículo no encontrado', 404);

  const payload = normalizePayload(data);
  await validateReferences(payload);
  await ensureUniqueFields(payload, articleId);
  await repo.update(articleId, payload);
}

async function removeArticle(id) {
  const articleId = Number(id);
  if (!articleId) throw new AppError('ID de artículo inválido', 400);

  const current = await repo.findById(articleId);
  if (!current) throw new AppError('Artículo no encontrado', 404);

  await repo.remove(articleId);
}

module.exports = { listArticles, getArticleById, createArticle, updateArticle, removeArticle };
