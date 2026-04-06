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

const paySale = asyncHandler(async (req, res) => {
  const data = await service.paySale(Number(req.params.id), req.user, req.body || {});
  res.json({ ok: true, data });
});

const getById = asyncHandler(async (req, res) => {
  const data = await service.getSaleDetail(Number(req.params.id));
  res.json({ ok: true, data });
});

module.exports = { createSale, addItem, paySale, getById };
