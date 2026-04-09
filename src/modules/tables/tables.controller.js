const asyncHandler = require('../../middlewares/asyncHandler');
const repo = require('./tables.repository');
const AppError = require('../../utils/appError');

function normalizeCapacity(value) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new AppError('Capacidad inválida. Debe ser un número entero mayor a 0.', 400);
  }
  return parsed;
}

const list = asyncHandler(async (req, res) => {
  const branchId = Number(req.query.branchId || req.user.branchId);
  res.json({ ok: true, data: await repo.list(branchId) });
});
const create = asyncHandler(async (req, res) => {
  const payload = {
    ...req.body,
    branchId: Number(req.body.branchId || req.user.branchId),
    capacity: normalizeCapacity(req.body.capacity),
  };
  res.status(201).json({ ok: true, data: await repo.create(payload) });
});
const update = asyncHandler(async (req, res) => {
  await repo.update(Number(req.params.id), {
    ...req.body,
    capacity: normalizeCapacity(req.body.capacity),
  });
  res.json({ ok: true });
});

const updateStatus = asyncHandler(async (req, res) => {
  await repo.updateStatus(Number(req.params.id), req.body.status);
  res.json({ ok: true });
});

const remove = asyncHandler(async (req, res) => {
  await repo.remove(Number(req.params.id));
  res.json({ ok: true });
});

module.exports = { list, create, update, updateStatus, remove };
