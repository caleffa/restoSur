const asyncHandler = require('../../middlewares/asyncHandler');
const service = require('./purchaseOrders.service');

const listPurchaseOrders = asyncHandler(async (req, res) => {
  const branchId = Number(req.query.branchId || req.user.branchId);
  const data = await service.list(branchId);
  res.json({ ok: true, data });
});

const getPurchaseOrderById = asyncHandler(async (req, res) => {
  const branchId = Number(req.query.branchId || req.user.branchId);
  const data = await service.getById(req.params.id, branchId);
  res.json({ ok: true, data });
});

const createPurchaseOrder = asyncHandler(async (req, res) => {
  const data = await service.create(req.body, req.user);
  res.status(201).json({ ok: true, data });
});

const receivePurchaseOrder = asyncHandler(async (req, res) => {
  const data = await service.receive(req.params.id, req.body, req.user);
  res.status(201).json({ ok: true, data });
});

const closePurchaseOrderWithDifferences = asyncHandler(async (req, res) => {
  const data = await service.closeWithDifferences(req.params.id, req.body, req.user);
  res.json({ ok: true, data });
});

module.exports = {
  listPurchaseOrders,
  getPurchaseOrderById,
  createPurchaseOrder,
  receivePurchaseOrder,
  closePurchaseOrderWithDifferences,
};
