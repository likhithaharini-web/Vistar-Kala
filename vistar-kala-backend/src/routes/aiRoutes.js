const express = require('express');
const aiController = require('../controllers/aiController');

const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/role');
const upload = require('../middleware/upload');

const router = express.Router();

router.post('/ai/enhance-image', authenticate, requireRole('artisan'), upload.single('image'), aiController.enhanceImage);
router.post('/ai/transcribe', authenticate, requireRole('artisan'), upload.single('audio'), aiController.transcribe);
router.post('/ai/catalogue', authenticate, requireRole('artisan'), aiController.generateCatalogue);
router.post('/ai/fair-price', authenticate, requireRole('artisan'), aiController.fairPrice);

// Public endpoint — no auth required so buyers can read heritage stories on product pages
router.post('/ai/story-gen', aiController.generateStory);

module.exports = router;
