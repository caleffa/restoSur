const asyncHandler = require('../../middlewares/asyncHandler');
const service = require('./invoices.service');

const create = asyncHandler(async (req, res) => {
  res.status(201).json({ ok: true, data: await service.createInvoice(req.body, req.user) });
});

const list = asyncHandler(async (req, res) => {
  res.json({ ok: true, data: await service.listInvoices(Number(req.user.branchId)) });
});

module.exports = { create, list };
