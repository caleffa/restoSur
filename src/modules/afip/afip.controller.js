const asyncHandler = require('../../middlewares/asyncHandler');
const service = require('./afip.service');

const list = asyncHandler(async (req, res) => {
  const branchId = Number(req.query.branchId || req.user.branchId);
  res.json({ ok: true, data: await service.listCaea(branchId) });
});

const create = asyncHandler(async (req, res) => {
  res.status(201).json({ ok: true, data: await service.createCaea(req.body) });
});

const request = asyncHandler(async (req, res) => {
  const branchId = Number(req.user.branchId);
  res.status(201).json({ ok: true, data: await service.requestCaea(branchId, req.body || {}) });
});

const getConfig = asyncHandler(async (req, res) => {
  const branchId = Number(req.query.branchId || req.user.branchId);
  res.json({ ok: true, data: await service.getConfig(branchId) });
});

const upsertConfig = asyncHandler(async (req, res) => {
  const branchId = Number(req.query.branchId || req.user.branchId);
  res.json({ ok: true, data: await service.upsertConfig(branchId, req.body || {}) });
});

module.exports = { list, create, request, getConfig, upsertConfig };
