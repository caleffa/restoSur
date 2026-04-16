const repo = require('./kitchenTypes.repository');
const AppError = require('../../utils/appError');

function normalizePayload(data) {
  const name = String(data.name || '').trim();
  if (!name) throw new AppError('El nombre del tipo de cocina es obligatorio', 400);

  const description = data.description ? String(data.description).trim() : null;
  const active = data.active === undefined ? true : Boolean(data.active);

  return { name, description, active };
}

async function listKitchenTypes() {
  return repo.list();
}

async function createKitchenType(data) {
  const payload = normalizePayload(data);
  const exists = await repo.findByName(payload.name);
  if (exists) throw new AppError('Ya existe un tipo de cocina con ese nombre', 409);
  return repo.create(payload);
}

async function updateKitchenType(id, data) {
  const kitchenTypeId = Number(id);
  if (!kitchenTypeId) throw new AppError('ID de tipo de cocina inválido', 400);

  const current = await repo.findById(kitchenTypeId);
  if (!current) throw new AppError('Tipo de cocina no encontrado', 404);

  const payload = normalizePayload(data);
  const exists = await repo.findByName(payload.name);
  if (exists && exists.id !== kitchenTypeId) throw new AppError('Ya existe un tipo de cocina con ese nombre', 409);

  await repo.update(kitchenTypeId, payload);
}

async function removeKitchenType(id) {
  const kitchenTypeId = Number(id);
  if (!kitchenTypeId) throw new AppError('ID de tipo de cocina inválido', 400);

  const current = await repo.findById(kitchenTypeId);
  if (!current) throw new AppError('Tipo de cocina no encontrado', 404);

  await repo.remove(kitchenTypeId);
}

module.exports = {
  listKitchenTypes,
  createKitchenType,
  updateKitchenType,
  removeKitchenType,
};
