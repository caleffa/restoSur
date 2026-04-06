const asyncHandler = require('../../middlewares/asyncHandler');
const service = require('./users.service');

const listUsers = asyncHandler(async (_req, res) => {
  res.json({ ok: true, data: await service.listUsers() });
});

const createUser = asyncHandler(async (req, res) => {
  const data = await service.createUser(req.body);
  res.status(201).json({ ok: true, data });
});

const updateUser = asyncHandler(async (req, res) => {
  const data = await service.updateUser(req.params.id, req.body);
  res.json({ ok: true, data });
});

const deleteUser = asyncHandler(async (req, res) => {
  await service.removeUser(req.params.id);
  res.json({ ok: true });
});

module.exports = { listUsers, createUser, updateUser, deleteUser };
