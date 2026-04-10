const repo = require('./articleTypes.repository');
const AppError = require('../../utils/appError');

function normalizePayload(data) {
  const name = String(data.name || '').trim();
  if (!name) throw new AppError('El nombre del tipo de artículo es obligatorio', 400);

  const description = data.description ? String(data.description).trim() : null;
  return { name, description };
}

async function listArticleTypes() {
  return repo.list();
}

async function createArticleType(data) {
  const payload = normalizePayload(data);
  const exists = await repo.findByName(payload.name);
  if (exists) throw new AppError('Ya existe un tipo de artículo con ese nombre', 409);
  return repo.create(payload.name, payload.description);
}

async function updateArticleType(id, data) {
  const articleTypeId = Number(id);
  if (!articleTypeId) throw new AppError('ID de tipo de artículo inválido', 400);

  const current = await repo.findById(articleTypeId);
  if (!current) throw new AppError('Tipo de artículo no encontrado', 404);

  const payload = normalizePayload(data);
  const exists = await repo.findByName(payload.name);
  if (exists && exists.id !== articleTypeId) throw new AppError('Ya existe un tipo de artículo con ese nombre', 409);

  await repo.update(articleTypeId, payload.name, payload.description);
}

async function removeArticleType(id) {
  const articleTypeId = Number(id);
  if (!articleTypeId) throw new AppError('ID de tipo de artículo inválido', 400);

  const current = await repo.findById(articleTypeId);
  if (!current) throw new AppError('Tipo de artículo no encontrado', 404);

  await repo.remove(articleTypeId);
}

module.exports = { listArticleTypes, createArticleType, updateArticleType, removeArticleType };
