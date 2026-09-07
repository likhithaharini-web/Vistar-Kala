const express = require('express');
const requirementController = require('../controllers/requirementController');
const { authenticate, optionalAuthenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/role');

const router = express.Router();

router.post('/requirements', authenticate, requireRole('buyer'), requirementController.createRequirement);
router.get('/requirements', optionalAuthenticate, requirementController.listRequirements);
router.get('/requirements/:id', optionalAuthenticate, requirementController.getRequirement);

router.post('/requirements/:id/bids', authenticate, requireRole('artisan'), requirementController.submitReverseBid);
router.get('/requirements/:id/bids', authenticate, requirementController.listReverseBids);
router.post('/requirements/:id/select-artisan', authenticate, requireRole('buyer'), requirementController.selectArtisan);

module.exports = router;
