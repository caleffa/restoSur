const asyncHandler = require('../../middlewares/asyncHandler');
const service = require('./profits.service');

const getReport = asyncHandler(async (req, res) => {
  const data = await service.getProfitReport(Number(req.user.branchId), req.query || {});
  res.json({ ok: true, data });
});

module.exports = {
  getReport,
};
