const asyncHandler = require('../../middlewares/asyncHandler');
const service = require('./kitchens.service');

const listKitchens = asyncHandler(async (req, res) => {
  res.json({ ok: true, data: await service.listKitchens(req.query, req.user) });
});

const createKitchen = asyncHandler(async (req, res) => {
  const data = await service.createKitchen(req.body, req.user);
  res.status(201).json({ ok: true, data });
});

const updateKitchen = asyncHandler(async (req, res) => {
  await service.updateKitchen(req.params.id, req.body, req.user);
  res.json({ ok: true });
});

const deleteKitchen = asyncHandler(async (req, res) => {
  await service.removeKitchen(req.params.id, req.user);
  res.json({ ok: true });
});

module.exports = {
  listKitchens,
  createKitchen,
  updateKitchen,
  deleteKitchen,
};
