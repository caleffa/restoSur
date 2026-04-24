const asyncHandler = require('../../middlewares/asyncHandler');
const service = require('./paymentMethods.service');

const listPaymentMethods = asyncHandler(async (req, res) => {
  const onlyActive = String(req.query?.activeOnly || '').trim() === '1';
  const data = await service.listPaymentMethods({ onlyActive });
  res.json({ ok: true, data });
});

const createPaymentMethod = asyncHandler(async (req, res) => {
  const data = await service.createPaymentMethod(req.body || {});
  res.status(201).json({ ok: true, data });
});

const updatePaymentMethod = asyncHandler(async (req, res) => {
  const data = await service.updatePaymentMethod(req.params.id, req.body || {});
  res.json({ ok: true, data });
});

const deletePaymentMethod = asyncHandler(async (req, res) => {
  const data = await service.removePaymentMethod(req.params.id);
  res.json({ ok: true, data });
});

module.exports = {
  listPaymentMethods,
  createPaymentMethod,
  updatePaymentMethod,
  deletePaymentMethod,
};
