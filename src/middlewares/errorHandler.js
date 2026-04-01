const { logError } = require('../utils/logger');

module.exports = (err, req, res, _next) => {
  const status = err.statusCode || 500;
  if (!err.isOperational) {
    logError('Unhandled error', { error: err.message, stack: err.stack });
  }

  res.status(status).json({
    ok: false,
    message: err.message || 'Internal server error',
  });
};
