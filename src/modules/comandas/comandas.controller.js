const asyncHandler = require('../../middlewares/asyncHandler');
const service = require('./comandas.service');

const listComandas = asyncHandler(async (req, res) => {
  const data = await service.listComandas({
    branchId: req.query.branchId || req.user.branchId,
    status: req.query.status,
    tableId: req.query.tableId,
  });

  res.json({ ok: true, data });
});

const getComandaById = asyncHandler(async (req, res) => {
  const data = await service.getComandaById(req.params.id);
  res.json({ ok: true, data });
});

const createComanda = asyncHandler(async (req, res) => {
  const data = await service.createComanda(req.body);
  res.status(201).json({ ok: true, data });
});

const updateComandaStatus = asyncHandler(async (req, res) => {
  const data = await service.updateComandaStatus(req.params.id, req.body.status, req.user.id);
  res.json({ ok: true, data });
});

const deleteComanda = asyncHandler(async (req, res) => {
  await service.removeComanda(req.params.id);
  res.json({ ok: true });
});

module.exports = {
  listComandas,
  getComandaById,
  createComanda,
  updateComandaStatus,
  deleteComanda,
};
