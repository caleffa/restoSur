const asyncHandler = require('../../middlewares/asyncHandler');
const service = require('./areas.service');

const listAreas = asyncHandler(async (req, res) => {
  const branchId = Number(req.query.branchId || req.user.branchId);
  res.json({ ok: true, data: await service.listAreas(branchId) });
});

const createArea = asyncHandler(async (req, res) => {
  const data = await service.createArea({
    ...req.body,
    branchId: Number(req.body.branchId || req.user.branchId),
  });
  res.status(201).json({ ok: true, data });
});

const updateArea = asyncHandler(async (req, res) => {
  await service.updateArea(req.params.id, req.body);
  res.json({ ok: true });
});

const deleteArea = asyncHandler(async (req, res) => {
  await service.removeArea(req.params.id);
  res.json({ ok: true });
});

module.exports = { listAreas, createArea, updateArea, deleteArea };
