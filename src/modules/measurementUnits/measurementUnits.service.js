const repo = require('./measurementUnits.repository');
const AppError = require('../../utils/appError');

function normalizePayload(data) {
  const name = String(data.name || '').trim();
  const code = String(data.code || '').trim().toUpperCase();

  if (!name) throw new AppError('El nombre de la unidad de medida es obligatorio', 400);
  if (!code) throw new AppError('El código de la unidad de medida es obligatorio', 400);

  const description = data.description ? String(data.description).trim() : null;
  const allowsFraction = data.allowsFraction === undefined ? true : Boolean(data.allowsFraction);
  return { name, code, description, allowsFraction };
}

async function listMeasurementUnits() {
  return repo.list();
}

async function createMeasurementUnit(data) {
  const payload = normalizePayload(data);
  const exists = await repo.findByCode(payload.code);
  if (exists) throw new AppError('Ya existe una unidad de medida con ese código', 409);
  return repo.create(payload);
}

async function updateMeasurementUnit(id, data) {
  const measurementUnitId = Number(id);
  if (!measurementUnitId) throw new AppError('ID de unidad de medida inválido', 400);

  const current = await repo.findById(measurementUnitId);
  if (!current) throw new AppError('Unidad de medida no encontrada', 404);

  const payload = normalizePayload(data);
  const exists = await repo.findByCode(payload.code);
  if (exists && exists.id !== measurementUnitId) throw new AppError('Ya existe una unidad de medida con ese código', 409);

  await repo.update(measurementUnitId, payload);
}

async function removeMeasurementUnit(id) {
  const measurementUnitId = Number(id);
  if (!measurementUnitId) throw new AppError('ID de unidad de medida inválido', 400);

  const current = await repo.findById(measurementUnitId);
  if (!current) throw new AppError('Unidad de medida no encontrada', 404);

  await repo.remove(measurementUnitId);
}

module.exports = { listMeasurementUnits, createMeasurementUnit, updateMeasurementUnit, removeMeasurementUnit };
