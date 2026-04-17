const repo = require('./vatTypes.repository');
const AppError = require('../../utils/appError');

function normalizePayload(data) {
  const name = String(data.name || '').trim();
  if (!name) throw new AppError('El nombre es obligatorio', 400);

  const code = String(data.code || '').trim().toUpperCase();
  if (!code) throw new AppError('El código es obligatorio', 400);

  const description = data.description ? String(data.description).trim() : null;

  return {
    name,
    code,
    description,
    active: data.active === undefined ? true : Boolean(data.active),
  };
}

async function listVatTypes() {
  return repo.list();
}

async function createVatType(data) {
  const payload = normalizePayload(data);
  const exists = await repo.findByName(payload.name);
  if (exists) throw new AppError('Ya existe un tipo de IVA con ese nombre', 409);
  return repo.create(payload);
}

async function updateVatType(id, data) {
  const vatTypeId = Number(id);
  if (!vatTypeId) throw new AppError('ID inválido', 400);

  const current = await repo.findById(vatTypeId);
  if (!current) throw new AppError('Tipo de IVA no encontrado', 404);

  const payload = normalizePayload(data);
  const exists = await repo.findByName(payload.name, vatTypeId);
  if (exists) throw new AppError('Ya existe un tipo de IVA con ese nombre', 409);

  await repo.update(vatTypeId, payload);
}

async function removeVatType(id) {
  const vatTypeId = Number(id);
  if (!vatTypeId) throw new AppError('ID inválido', 400);

  const current = await repo.findById(vatTypeId);
  if (!current) throw new AppError('Tipo de IVA no encontrado', 404);

  await repo.remove(vatTypeId);
}

module.exports = { listVatTypes, createVatType, updateVatType, removeVatType };
