const asyncHandler = require('../../middlewares/asyncHandler');
const service = require('./stock.service');

const list = asyncHandler(async (req, res) => {
  const branchId = Number(req.query.branchId || req.user.branchId);
  res.json({ ok: true, data: await service.list(branchId) });
});

const listMovements = asyncHandler(async (req, res) => {
  const branchId = Number(req.query.branchId || req.user.branchId);
  const limit = req.query.limit ? Number(req.query.limit) : 100;
  res.json({ ok: true, data: await service.listMovements(branchId, limit) });
});

const movement = asyncHandler(async (req, res) => {
  res.status(201).json({ ok: true, data: await service.movement(req.body, req.user) });
});

module.exports = { list, movement, listMovements };
