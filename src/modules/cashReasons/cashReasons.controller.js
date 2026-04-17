const asyncHandler = require('../../middlewares/asyncHandler');
const service = require('./cashReasons.service');

const listCashReasons = asyncHandler(async (req, res) => {
  res.json({ ok: true, data: await service.listCashReasons(req.query.type) });
});

const createCashReason = asyncHandler(async (req, res) => {
  const data = await service.createCashReason(req.body);
  res.status(201).json({ ok: true, data });
});

const updateCashReason = asyncHandler(async (req, res) => {
  await service.updateCashReason(req.params.id, req.body);
  res.json({ ok: true });
});

const deleteCashReason = asyncHandler(async (req, res) => {
  await service.removeCashReason(req.params.id);
  res.json({ ok: true });
});

module.exports = { listCashReasons, createCashReason, updateCashReason, deleteCashReason };
