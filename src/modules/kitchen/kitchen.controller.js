const asyncHandler = require('../../middlewares/asyncHandler');
const service = require('./kitchen.service');

const send = asyncHandler(async (req, res) => {
  res.status(201).json({ ok: true, data: await service.sendToKitchen(Number(req.params.saleId)) });
});

const list = asyncHandler(async (req, res) => {
  const branchId = Number(req.query.branchId || req.user.branchId);
  res.json({ ok: true, data: await service.list(branchId) });
});

const update = asyncHandler(async (req, res) => {
  await service.updateStatus(Number(req.params.id), req.body.status);
  res.json({ ok: true });
});

module.exports = { send, list, update };
