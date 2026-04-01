const asyncHandler = require('../../middlewares/asyncHandler');
const service = require('./cash.service');

const open = asyncHandler(async (req, res) => res.status(201).json({ ok: true, data: await service.open(req.body, req.user) }));
const close = asyncHandler(async (req, res) => res.json({ ok: true, data: await service.close(req.body, req.user) }));
const current = asyncHandler(async (req, res) => {
  const branchId = Number(req.query.branchId || req.user.branchId);
  res.json({ ok: true, data: await service.current(branchId) });
});
const movements = asyncHandler(async (req, res) => res.json({ ok: true, data: await service.movements(Number(req.params.id)) }));

module.exports = { open, close, current, movements };
