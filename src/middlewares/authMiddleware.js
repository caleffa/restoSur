const jwt = require('jsonwebtoken');
const { jwt: jwtConfig } = require('../config/env');
const AppError = require('../utils/appError');
//const { PiColumnsPlusLeftDuotone } = require('react-icons/pi');

function normalizeRole(role) {
  return String(role ?? '')
    .trim()
    .toUpperCase();
}

function authMiddleware(req, _res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return next(new AppError('Token requerido', 401));

  const token = authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
  if (!token) return next(new AppError('Formato de token inválido', 401));

  try {
    const payload = jwt.verify(token, jwtConfig.secret);
    req.user = { ...payload, role: normalizeRole(payload.role) };
    return next();
  } catch (_e) {
    return next(new AppError('Token inválido o expirado', 401));
  }
}

function roleMiddleware(...roles) {
  const allowedRoles = roles.map(normalizeRole);

  return (req, _res, next) => {

    console.log('PATH:', req.originalUrl);
    console.log('ROLES PERMITIDOS:', allowedRoles);
    const userRole = normalizeRole(req.user?.role);

    if (!userRole || !allowedRoles.includes(userRole)) {
      return next(new AppError(
        `Rol requerido: (${allowedRoles.join(', ')}) | Usuario: (${userRole})`,
        403
      ));
    }

    return next();
  };
}

module.exports = { authMiddleware, roleMiddleware };
