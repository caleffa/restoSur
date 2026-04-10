const asyncHandler = require('../../middlewares/asyncHandler');
const service = require('./measurementUnits.service');

const listMeasurementUnits = asyncHandler(async (_req, res) => {
  res.json({ ok: true, data: await service.listMeasurementUnits() });
});

const createMeasurementUnit = asyncHandler(async (req, res) => {
  const data = await service.createMeasurementUnit(req.body);
  res.status(201).json({ ok: true, data });
});

const updateMeasurementUnit = asyncHandler(async (req, res) => {
  await service.updateMeasurementUnit(req.params.id, req.body);
  res.json({ ok: true });
});

const deleteMeasurementUnit = asyncHandler(async (req, res) => {
  await service.removeMeasurementUnit(req.params.id);
  res.json({ ok: true });
});

module.exports = { listMeasurementUnits, createMeasurementUnit, updateMeasurementUnit, deleteMeasurementUnit };
