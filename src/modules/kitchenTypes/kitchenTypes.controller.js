const asyncHandler = require('../../middlewares/asyncHandler');
const service = require('./kitchenTypes.service');

const listKitchenTypes = asyncHandler(async (_req, res) => {
  res.json({ ok: true, data: await service.listKitchenTypes() });
});

const createKitchenType = asyncHandler(async (req, res) => {
  const data = await service.createKitchenType(req.body);
  res.status(201).json({ ok: true, data });
});

const updateKitchenType = asyncHandler(async (req, res) => {
  await service.updateKitchenType(req.params.id, req.body);
  res.json({ ok: true });
});

const deleteKitchenType = asyncHandler(async (req, res) => {
  await service.removeKitchenType(req.params.id);
  res.json({ ok: true });
});

module.exports = {
  listKitchenTypes,
  createKitchenType,
  updateKitchenType,
  deleteKitchenType,
};
