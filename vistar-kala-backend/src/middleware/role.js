const ApiError = require('../utils/ApiError');

/**
 * requireRole('artisan', 'admin') -> only these roles may proceed.
 * Must run after `authenticate`.
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new ApiError(401, 'Authentication required'));
    }
    if (!roles.includes(req.user.role)) {
      return next(new ApiError(403, `This action requires role: ${roles.join(' or ')}`));
    }
    next();
  };
}

module.exports = { requireRole };
