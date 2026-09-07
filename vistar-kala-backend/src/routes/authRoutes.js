const express = require('express');
const { body } = require('express-validator');
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const validate = require('../middleware/validate');

const router = express.Router();

router.post('/auth/send-otp', [body('phone').isString().notEmpty()], validate, authController.sendOtp);

router.post(
  '/auth/verify-otp',
  [body('phone').isString().notEmpty(), body('code').isString().notEmpty()],
  validate,
  authController.verifyOtp,
);

router.get('/user/profile', authenticate, authController.getProfile);
router.put('/user/profile', authenticate, authController.updateProfile);

module.exports = router;
