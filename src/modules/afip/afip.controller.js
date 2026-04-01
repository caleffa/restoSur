const asyncHandler = require('../../middlewares/asyncHandler');
const service = require('./afip.service');

const list = asyncHandler(async (req, res) => {
  const branchId = Number(req.query.branchId || req.user.branchId);
  res.json({ ok: true, data: await service.listCaea(branchId) });
});

const create = asyncHandler(async (req, res) => {
  res.status(201).json({ ok: true, data: await service.createCaea(req.body) });
});

module.exports = { list, create };
