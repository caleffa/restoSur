const asyncHandler = require('../../middlewares/asyncHandler');
const service = require('./kitchen.service');
const AppError = require('../../utils/appError');

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

const listOrdersByTable = asyncHandler(async (req, res) => {
  const tableId = Number(req.query.tableId);
  if (!Number.isInteger(tableId) || tableId <= 0) throw new AppError('tableId inválido', 400);
  const branchId = Number(req.user.branchId);
  res.json({ ok: true, data: await service.listByTable(tableId, branchId) });
});

const createOrder = asyncHandler(async (req, res) => {
  const tableId = Number(req.body.tableId);
  if (!Number.isInteger(tableId) || tableId <= 0) throw new AppError('tableId inválido', 400);

  const payload = {
    tableId,
    branchId: Number(req.user.branchId),
    status: req.body.status,
  };
  const created = await service.createByTable(payload);
  res.status(201).json({
    ok: true,
    data: {
      ...created,
      productId: req.body.productId,
      articleName: req.body.articleName,
      quantity: Number(req.body.quantity || 0),
      timestamp: req.body.timestamp || created.createdAt,
    },
  });
});

module.exports = { send, list, update, listOrdersByTable, createOrder };
