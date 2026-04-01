const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { jwt: jwtConfig } = require('../../config/env');
const repo = require('./auth.repository');
const AppError = require('../../utils/appError');

async function login(email, password) {

  const user = await repo.findByEmail(email);

  if (!user) throw new AppError('Credenciales inválidas', 401);

  const hash = (user.password_hash || user.password || '').trim();
  const ok = await bcrypt.compare(password, hash);

  if (!ok) throw new AppError('Credenciales inválidas!', 401);

  const token = jwt.sign({ id: user.id, role: user.role, branchId: user.branch_id }, jwtConfig.secret, {
    expiresIn: jwtConfig.expiresIn,
  });

  return {
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role, branchId: user.branch_id },
  };
}

module.exports = { login };
