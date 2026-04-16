const repo = require('./kitchens.repository');
const kitchenTypesRepo = require('../kitchenTypes/kitchenTypes.repository');
const AppError = require('../../utils/appError');

function parseBoolean(value) {
  if (value === undefined || value === null || value === '') return null;
  if (value === true || value === 'true' || value === 1 || value === '1') return true;
  if (value === false || value === 'false' || value === 0 || value === '0') return false;
  return null;
}

function normalizePayload(data, branchIdFromUser) {
  const name = String(data.name || '').trim();
  if (!name) throw new AppError('El nombre de la cocina es obligatorio', 400);

  const branchId = Number(data.branchId || branchIdFromUser);
  if (!branchId) throw new AppError('Sucursal inválida', 400);

  const kitchenTypeId = Number(data.kitchenTypeId);
  if (!kitchenTypeId) throw new AppError('El tipo de cocina es obligatorio', 400);

  const description = data.description ? String(data.description).trim() : null;
  const active = data.active === undefined ? true : Boolean(data.active);

  return {
    branchId,
    kitchenTypeId,
    name,
    description,
    active,
  };
}

async function validateKitchenType(kitchenTypeId) {
  const kitchenType = await kitchenTypesRepo.findById(kitchenTypeId);
  if (!kitchenType) throw new AppError('Tipo de cocina no encontrado', 404);
}

async function listKitchens(params, user) {
  const branchId = user.role === 'ADMIN'
    ? (params.branchId ? Number(params.branchId) : null)
    : Number(user.branchId);

  const kitchenTypeId = params.kitchenTypeId ? Number(params.kitchenTypeId) : null;
  const active = parseBoolean(params.active);

  return repo.list({ branchId, kitchenTypeId, active });
}

async function createKitchen(data, user) {
  const payload = normalizePayload(data, user.branchId);
  await validateKitchenType(payload.kitchenTypeId);

  const exists = await repo.findByNameAndBranch(payload.name, payload.branchId);
  if (exists) throw new AppError('Ya existe una cocina con ese nombre en la sucursal', 409);

  const { id } = await repo.create(payload);
  return repo.findById(id);
}

async function updateKitchen(id, data, user) {
  const kitchenId = Number(id);
  if (!kitchenId) throw new AppError('ID de cocina inválido', 400);

  const current = await repo.findById(kitchenId);
  if (!current) throw new AppError('Cocina no encontrada', 404);

  if (user.role !== 'ADMIN' && Number(current.branch_id) !== Number(user.branchId)) {
    throw new AppError('No autorizado para editar esta cocina', 403);
  }

  const payload = normalizePayload(
    { ...data, branchId: current.branch_id },
    current.branch_id
  );

  await validateKitchenType(payload.kitchenTypeId);

  const exists = await repo.findByNameAndBranch(payload.name, current.branch_id);
  if (exists && exists.id !== kitchenId) {
    throw new AppError('Ya existe una cocina con ese nombre en la sucursal', 409);
  }

  await repo.update(kitchenId, payload);
}

async function removeKitchen(id, user) {
  const kitchenId = Number(id);
  if (!kitchenId) throw new AppError('ID de cocina inválido', 400);

  const current = await repo.findById(kitchenId);
  if (!current) throw new AppError('Cocina no encontrada', 404);

  if (user.role !== 'ADMIN' && Number(current.branch_id) !== Number(user.branchId)) {
    throw new AppError('No autorizado para eliminar esta cocina', 403);
  }

  await repo.remove(kitchenId);
}

module.exports = {
  listKitchens,
  createKitchen,
  updateKitchen,
  removeKitchen,
};
