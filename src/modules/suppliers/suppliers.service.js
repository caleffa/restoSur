const repo = require('./suppliers.repository');
const articlesRepo = require('../articles/articles.repository');
const AppError = require('../../utils/appError');

function cleanText(value) {
  const normalized = String(value || '').trim();
  return normalized || null;
}

function normalizeCuit(cuit) {
  const digits = String(cuit || '').replace(/\D/g, '');
  return digits || null;
}

function normalizePayload(data, user) {
  const businessName = String(data.businessName || '').trim();
  if (!businessName) throw new AppError('La razón social es obligatoria', 400);

  return {
    branchId: Number(user.branchId || data.branchId),
    businessName,
    fantasyName: cleanText(data.fantasyName),
    cuit: normalizeCuit(data.cuit),
    vatTypeId: data.vatTypeId ? Number(data.vatTypeId) : null,
    grossIncomeNumber: cleanText(data.grossIncomeNumber),
    email: cleanText(data.email),
    phone: cleanText(data.phone),
    address: cleanText(data.address),
    city: cleanText(data.city),
    province: cleanText(data.province),
    postalCode: cleanText(data.postalCode),
    active: data.active === undefined ? true : Boolean(data.active),
  };
}

function normalizeArticleIds(articleIds) {
  if (!Array.isArray(articleIds)) return [];
  const unique = new Set();
  for (const value of articleIds) {
    const parsed = Number(value);
    if (Number.isInteger(parsed) && parsed > 0) unique.add(parsed);
  }
  return Array.from(unique);
}

async function validateArticlesExist(articleIds) {
  for (const articleId of articleIds) {
    const article = await articlesRepo.findById(articleId);
    if (!article) throw new AppError(`Artículo no encontrado (ID ${articleId})`, 404);
  }
}

async function listSuppliers(branchId) {
  return repo.list(branchId);
}

async function createSupplier(data, user) {
  const payload = normalizePayload(data, user);
  const articleIds = normalizeArticleIds(data.articleIds);
  if (payload.cuit) {
    const exists = await repo.findByCuit(payload.branchId, payload.cuit);
    if (exists) throw new AppError('Ya existe un proveedor con ese CUIT', 409);
  }
  await validateArticlesExist(articleIds);
  const created = await repo.create(payload);
  await repo.syncArticles(created.id, articleIds);
  return created;
}

async function updateSupplier(id, data, user) {
  const supplierId = Number(id);
  if (!supplierId) throw new AppError('ID de proveedor inválido', 400);

  const current = await repo.findById(supplierId);
  if (!current) throw new AppError('Proveedor no encontrado', 404);

  const payload = normalizePayload(data, user);
  const articleIds = normalizeArticleIds(data.articleIds);

  if (payload.cuit) {
    const exists = await repo.findByCuit(payload.branchId, payload.cuit, supplierId);
    if (exists) throw new AppError('Ya existe un proveedor con ese CUIT', 409);
  }

  await validateArticlesExist(articleIds);
  await repo.update(supplierId, payload);
  await repo.syncArticles(supplierId, articleIds);
}

async function removeSupplier(id) {
  const supplierId = Number(id);
  if (!supplierId) throw new AppError('ID de proveedor inválido', 400);

  const current = await repo.findById(supplierId);
  if (!current) throw new AppError('Proveedor no encontrado', 404);

  await repo.remove(supplierId);
}

module.exports = { listSuppliers, createSupplier, updateSupplier, removeSupplier };
