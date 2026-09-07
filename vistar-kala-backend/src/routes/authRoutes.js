const express = require('express');
const { body } = require('express-validator');
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const validate = require('../middleware/validate');

const router = express.Router();

router.post(
  '/auth/register',
  [
    body('phone').isString().notEmpty().withMessage('phone is required'),
    body('password').isString().isLength({ min: 8 }).withMessage('password must be at least 8 characters long'),
  ],
  validate,
  authController.register,
);

router.post(
  '/auth/login',
  [
    body('phone').isString().notEmpty().withMessage('phone is required'),
    body('password').isString().notEmpty().withMessage('password is required'),
  ],
  validate,
  authController.login,
);

router.get('/user/profile', authenticate, authController.getProfile);
router.put('/user/profile', authenticate, authController.updateProfile);

module.exports = router;
