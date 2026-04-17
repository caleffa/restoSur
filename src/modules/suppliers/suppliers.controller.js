const asyncHandler = require('../../middlewares/asyncHandler');
const service = require('./suppliers.service');

const listSuppliers = asyncHandler(async (req, res) => {
  const branchId = Number(req.query.branchId || req.user.branchId);
  res.json({ ok: true, data: await service.listSuppliers(branchId) });
});

const createSupplier = asyncHandler(async (req, res) => {
  const data = await service.createSupplier(req.body, req.user);
  res.status(201).json({ ok: true, data });
});

const updateSupplier = asyncHandler(async (req, res) => {
  await service.updateSupplier(req.params.id, req.body, req.user);
  res.json({ ok: true });
});

const deleteSupplier = asyncHandler(async (req, res) => {
  await service.removeSupplier(req.params.id);
  res.json({ ok: true });
});

module.exports = { listSuppliers, createSupplier, updateSupplier, deleteSupplier };
