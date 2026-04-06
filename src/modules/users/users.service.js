const bcrypt = require('bcryptjs');
const repo = require('./users.repository');
const AppError = require('../../utils/appError');

const ROLES = ['ADMIN', 'CAJERO', 'MOZO', 'COCINA'];

function validatePayload(data) {
  if (!data.name || !data.email || !data.role) {
    throw new AppError('name, email y role son obligatorios', 400);
  }

  if (!ROLES.includes(data.role)) {
    throw new AppError('Rol inválido', 400);
  }

  if (!Number.isInteger(Number(data.branchId)) || Number(data.branchId) <= 0) {
    throw new AppError('branchId inválido', 400);
  }
}

async function ensureEmailAvailable(email, userId = null) {
  const existing = await repo.findByEmail(email);
  if (existing && existing.id !== userId) {
    throw new AppError('El email ya está en uso', 409);
  }
}

async function listUsers() {
  return repo.list();
}

async function createUser(data) {
  validatePayload(data);

  if (!data.password || String(data.password).length < 6) {
    throw new AppError('La contraseña debe tener al menos 6 caracteres', 400);
  }

  await ensureEmailAvailable(String(data.email).trim().toLowerCase());
  const passwordHash = await bcrypt.hash(String(data.password), 10);

  return repo.create({
    branchId: Number(data.branchId),
    name: String(data.name).trim(),
    email: String(data.email).trim().toLowerCase(),
    passwordHash,
    role: data.role,
    active: data.active === undefined ? 1 : data.active ? 1 : 0,
  });
}

async function updateUser(id, data) {
  const userId = Number(id);
  if (!userId) throw new AppError('ID de usuario inválido', 400);

  const existing = await repo.findById(userId);
  if (!existing) throw new AppError('Usuario no encontrado', 404);

  validatePayload(data);
  await ensureEmailAvailable(String(data.email).trim().toLowerCase(), userId);

  const updated = await repo.update(userId, {
    branchId: Number(data.branchId),
    name: String(data.name).trim(),
    email: String(data.email).trim().toLowerCase(),
    role: data.role,
    active: data.active === undefined ? 1 : data.active ? 1 : 0,
  });

  if (data.password) {
    if (String(data.password).length < 6) {
      throw new AppError('La contraseña debe tener al menos 6 caracteres', 400);
    }
    const passwordHash = await bcrypt.hash(String(data.password), 10);
    await repo.updatePassword(userId, passwordHash);
  }

  return updated;
}

async function removeUser(id) {
  const userId = Number(id);
  if (!userId) throw new AppError('ID de usuario inválido', 400);

  const existing = await repo.findById(userId);
  if (!existing) throw new AppError('Usuario no encontrado', 404);

  await repo.remove(userId);
}

module.exports = { listUsers, createUser, updateUser, removeUser };
