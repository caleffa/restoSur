const asyncHandler = require('../../middlewares/asyncHandler');
const service = require('./vatTypes.service');

const listVatTypes = asyncHandler(async (_req, res) => {
  res.json({ ok: true, data: await service.listVatTypes() });
});

const createVatType = asyncHandler(async (req, res) => {
  const data = await service.createVatType(req.body);
  res.status(201).json({ ok: true, data });
});

const updateVatType = asyncHandler(async (req, res) => {
  await service.updateVatType(req.params.id, req.body);
  res.json({ ok: true });
});

const deleteVatType = asyncHandler(async (req, res) => {
  await service.removeVatType(req.params.id);
  res.json({ ok: true });
});

module.exports = { listVatTypes, createVatType, updateVatType, deleteVatType };
