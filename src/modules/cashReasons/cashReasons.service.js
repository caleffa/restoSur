const repo = require('./cashReasons.repository');
const AppError = require('../../utils/appError');

function normalizePayload(data) {
  const description = String(data.description || '').trim();
  if (!description) throw new AppError('La descripción es obligatoria', 400);

  const type = String(data.type || '').trim().toUpperCase();
  if (!['INGRESO', 'EGRESO'].includes(type)) throw new AppError('El tipo debe ser INGRESO o EGRESO', 400);

  return {
    description,
    type,
    active: data.active === undefined ? true : Boolean(data.active),
  };
}

async function listCashReasons(type) {
  const normalizedType = type ? String(type).trim().toUpperCase() : null;
  if (normalizedType && !['INGRESO', 'EGRESO'].includes(normalizedType)) {
    throw new AppError('Filtro de tipo inválido', 400);
  }
  return repo.list(normalizedType);
}

async function createCashReason(data) {
  const payload = normalizePayload(data);
  const exists = await repo.findByDescription(payload.description, payload.type);
  if (exists) throw new AppError('Ya existe un motivo con esa descripción para el tipo seleccionado', 409);
  return repo.create(payload);
}

async function updateCashReason(id, data) {
  const reasonId = Number(id);
  if (!reasonId) throw new AppError('ID de motivo inválido', 400);

  const current = await repo.findById(reasonId);
  if (!current) throw new AppError('Motivo no encontrado', 404);

  const payload = normalizePayload(data);
  const exists = await repo.findByDescription(payload.description, payload.type, reasonId);
  if (exists) throw new AppError('Ya existe un motivo con esa descripción para el tipo seleccionado', 409);

  await repo.update(reasonId, payload);
}

async function removeCashReason(id) {
  const reasonId = Number(id);
  if (!reasonId) throw new AppError('ID de motivo inválido', 400);

  const current = await repo.findById(reasonId);
  if (!current) throw new AppError('Motivo no encontrado', 404);

  await repo.remove(reasonId);
}

module.exports = { listCashReasons, createCashReason, updateCashReason, removeCashReason };
