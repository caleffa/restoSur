const asyncHandler = require('../../middlewares/asyncHandler');
const service = require('./dashboard.service');

const getSummary = asyncHandler(async (req, res) => {
  const data = await service.getSummary(Number(req.user.branchId));
  res.json({ ok: true, data });
});

const getSalesByHour = asyncHandler(async (req, res) => {
  const data = await service.getSalesByHour(Number(req.user.branchId));
  res.json({ ok: true, data });
});

const getWaiterDashboard = asyncHandler(async (req, res) => {
  const data = await service.getWaiterDashboard(Number(req.user.branchId), Number(req.user.id));
  res.json({ ok: true, data });
});

module.exports = { getSummary, getSalesByHour, getWaiterDashboard };
