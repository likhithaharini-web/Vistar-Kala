/**
 * translateRoutes.js
 * ------------------
 * Registers POST /translate with a dedicated rate limiter to prevent abuse
 * of the (paid) Google Translation API.
 */

const express = require('express');
const rateLimit = require('express-rate-limit');
const { body } = require('express-validator');
const { translateText } = require('../controllers/translateController');
const validate = require('../middleware/validate');

const router = express.Router();

// Stricter rate limit specifically for the translation endpoint (it calls a paid API)
const translateLimiter = rateLimit({
  windowMs: 60 * 1000,   // 1 minute window
  max: 60,               // 60 translation requests per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many translation requests. Please slow down.' },
});

router.post(
  '/translate',
  translateLimiter,
  [
    body('text').isString().notEmpty().withMessage('text must be a non-empty string'),
    body('targetLanguage').isString().notEmpty().withMessage('targetLanguage is required'),
    body('sourceLanguage').optional().isString(),
  ],
  validate,
  translateText,
);

module.exports = router;
