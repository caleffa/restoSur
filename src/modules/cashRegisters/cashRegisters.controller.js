const asyncHandler = require('../../middlewares/asyncHandler');
const service = require('./cashRegisters.service');

const listRegisters = asyncHandler(async (req, res) => {
  const branchId = Number(req.query.branchId || req.user.branchId);
  res.json({ ok: true, data: await service.listRegisters(branchId) });
});
const createRegister = asyncHandler(async (req, res) => res.status(201).json({ ok: true, data: await service.createRegister(req.body, req.user) }));
const updateRegister = asyncHandler(async (req, res) => res.json({ ok: true, data: await service.updateRegister(Number(req.params.id), req.body, req.user) }));
const deleteRegister = asyncHandler(async (req, res) => res.json({ ok: true, data: await service.deleteRegister(Number(req.params.id)) }));

module.exports = {
  listRegisters,
  createRegister,
  updateRegister,
  deleteRegister,
};
