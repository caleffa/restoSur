const asyncHandler = require('../../middlewares/asyncHandler');
const service = require('./stock.service');

const list = asyncHandler(async (req, res) => {
  const branchId = Number(req.query.branchId || req.user.branchId);
  res.json({ ok: true, data: await service.list(branchId) });
});

const movement = asyncHandler(async (req, res) => {
  res.status(201).json({ ok: true, data: await service.movement(req.body, req.user) });
});

module.exports = { list, movement };
