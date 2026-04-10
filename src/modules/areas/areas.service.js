const repo = require('./areas.repository');
const AppError = require('../../utils/appError');

function normalizeName(name) {
  const normalized = String(name || '').trim();
  if (!normalized) throw new AppError('El nombre del área es obligatorio.', 400);
  return normalized;
}

function normalizeBranchId(value) {
  const branchId = Number(value);
  if (!Number.isInteger(branchId) || branchId <= 0) {
    throw new AppError('Sucursal inválida.', 400);
  }
  return branchId;
}

function normalizeAreaId(value) {
  const areaId = Number(value);
  if (!Number.isInteger(areaId) || areaId <= 0) {
    throw new AppError('Área inválida.', 400);
  }
  return areaId;
}

async function listAreas(branchId) {
  return repo.listByBranch(normalizeBranchId(branchId));
}

async function createArea(payload) {
  return repo.create({
    branchId: normalizeBranchId(payload.branchId),
    name: normalizeName(payload.name),
  });
}

async function updateArea(id, payload) {
  const areaId = normalizeAreaId(id);
  const area = await repo.findById(areaId);
  if (!area) throw new AppError('Área no encontrada.', 404);

  await repo.update(areaId, { name: normalizeName(payload.name) });
}

async function removeArea(id) {
  const areaId = normalizeAreaId(id);
  const area = await repo.findById(areaId);
  if (!area) throw new AppError('Área no encontrada.', 404);

  await repo.remove(areaId);
}

module.exports = {
  listAreas,
  createArea,
  updateArea,
  removeArea,
};
