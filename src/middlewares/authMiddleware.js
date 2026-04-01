const jwt = require('jsonwebtoken');
const { jwt: jwtConfig } = require('../config/env');
const AppError = require('../utils/appError');

function authMiddleware(req, _res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return next(new AppError('Token requerido', 401));

  const token = authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
  if (!token) return next(new AppError('Formato de token inválido', 401));

  try {
    const payload = jwt.verify(token, jwtConfig.secret);
    req.user = payload;
    return next();
  } catch (_e) {
    return next(new AppError('Token inválido o expirado', 401));
  }
}

function roleMiddleware(...roles) {
  return (req, _res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new AppError('No autorizado para este recurso', 403));
    }
    return next();
  };
}

module.exports = { authMiddleware, roleMiddleware };
