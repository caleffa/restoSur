const asyncHandler = require('../../middlewares/asyncHandler');
const service = require('./auth.service');

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const data = await service.login(email, password);
  res.json({ ok: true, data });
});

module.exports = { login };
