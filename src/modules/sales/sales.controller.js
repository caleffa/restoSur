const asyncHandler = require('../../middlewares/asyncHandler');
const service = require('./sales.service');

const createSale = asyncHandler(async (req, res) => {
  const data = await service.createSale(req.body, req.user);
  res.status(201).json({ ok: true, data });
});

const addItem = asyncHandler(async (req, res) => {
  const data = await service.addItem(Number(req.params.id), req.body);
  res.status(201).json({ ok: true, data });
});

const updateItem = asyncHandler(async (req, res) => {
  const data = await service.updateItem(Number(req.params.itemId), req.body || {});
  res.json({ ok: true, data });
});

const deleteItem = asyncHandler(async (req, res) => {
  const data = await service.deleteItem(Number(req.params.itemId));
  res.json({ ok: true, data });
});

const requestBill = asyncHandler(async (req, res) => {
  const data = await service.requestBill(Number(req.params.id));
  res.json({ ok: true, data });
});

const paySale = asyncHandler(async (req, res) => {
  const data = await service.paySale(Number(req.params.id), req.user, req.body || {});
  res.json({ ok: true, data });
});

const closeSale = asyncHandler(async (req, res) => {
  const data = await service.closeSale(Number(req.params.id));
  res.json({ ok: true, data });
});

const getById = asyncHandler(async (req, res) => {
  const data = await service.getSaleDetail(Number(req.params.id));
  res.json({ ok: true, data });
});

const getByTable = asyncHandler(async (req, res) => {
  const data = await service.getSaleDetailByTable(Number(req.params.tableId));
  res.json({ ok: true, data });
});

const listOpen = asyncHandler(async (req, res) => {
  const data = await service.listOpenSales(Number(req.user.branchId));
  res.json({ ok: true, data });
});

module.exports = {
  createSale,
  addItem,
  updateItem,
  deleteItem,
  requestBill,
  paySale,
  closeSale,
  getById,
  getByTable,
  listOpen,
};
