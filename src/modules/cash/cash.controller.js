const asyncHandler = require('../../middlewares/asyncHandler');
const service = require('./cash.service');

const open = asyncHandler(async (req, res) => res.status(201).json({ ok: true, data: await service.openCash(req.body, req.user) }));
const close = asyncHandler(async (req, res) => res.json({ ok: true, data: await service.closeCash(req.body, req.user) }));
const current = asyncHandler(async (req, res) => {
  const branchId = Number(req.query.branchId || req.user.branchId);
  res.json({ ok: true, data: await service.getCurrent(branchId) });
});

const movements = asyncHandler(async (req, res) => {
  const shiftId = Number(req.query.shiftId || req.params.id);
  res.json({ ok: true, data: await service.movements(shiftId) });
});

const income = asyncHandler(async (req, res) => res.status(201).json({ ok: true, data: await service.addIncome(req.body, req.user) }));
const expense = asyncHandler(async (req, res) => res.status(201).json({ ok: true, data: await service.addExpense(req.body, req.user) }));
const registerSale = asyncHandler(async (req, res) => res.status(201).json({ ok: true, data: await service.registerSale(req.body, req.user) }));

const shifts = asyncHandler(async (req, res) => {
  const filters = {
    branchId: Number(req.query.branchId || req.user.branchId),
    registerId: req.query.registerId ? Number(req.query.registerId) : undefined,
    userId: req.query.userId ? Number(req.query.userId) : undefined,
    from: req.query.from,
    to: req.query.to,
  };
  res.json({ ok: true, data: await service.shifts(filters) });
});

const shiftById = asyncHandler(async (req, res) => res.json({ ok: true, data: await service.shiftById(Number(req.params.id)) }));

const reports = asyncHandler(async (req, res) => {
  const filters = {
    branchId: Number(req.query.branchId || req.user.branchId),
    registerId: req.query.registerId ? Number(req.query.registerId) : undefined,
    userId: req.query.userId ? Number(req.query.userId) : undefined,
    from: req.query.from,
    to: req.query.to,
  };

  res.json({ ok: true, data: await service.reports(filters) });
});

module.exports = {
  open,
  close,
  current,
  movements,
  income,
  expense,
  registerSale,
  shifts,
  shiftById,
  reports,
};
