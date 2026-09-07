const ApiError = require('../utils/ApiError');

function notFoundHandler(req, res, next) {
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({ success: false, message: err.message, details: err.details });
  }

  // Sequelize validation errors
  if (err.name === 'SequelizeValidationError' || err.name === 'SequelizeUniqueConstraintError') {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      details: err.errors ? err.errors.map((e) => e.message) : err.message,
    });
  }

  // eslint-disable-next-line no-console
  console.error(err);
  return res.status(500).json({ success: false, message: 'Internal server error' });
}

module.exports = { notFoundHandler, errorHandler };
