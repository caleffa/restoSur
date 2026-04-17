const asyncHandler = require('../../middlewares/asyncHandler');
const service = require('./customers.service');

const listCustomers = asyncHandler(async (req, res) => {
  const branchId = Number(req.query.branchId || req.user.branchId);
  res.json({ ok: true, data: await service.listCustomers(branchId) });
});

const createCustomer = asyncHandler(async (req, res) => {
  const data = await service.createCustomer(req.body, req.user);
  res.status(201).json({ ok: true, data });
});

const updateCustomer = asyncHandler(async (req, res) => {
  await service.updateCustomer(req.params.id, req.body, req.user);
  res.json({ ok: true });
});

const deleteCustomer = asyncHandler(async (req, res) => {
  await service.removeCustomer(req.params.id);
  res.json({ ok: true });
});

module.exports = { listCustomers, createCustomer, updateCustomer, deleteCustomer };
