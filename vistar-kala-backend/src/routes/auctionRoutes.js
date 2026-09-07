const express = require('express');
const auctionController = require('../controllers/auctionController');
const { authenticate, optionalAuthenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/role');

const router = express.Router();

router.post('/auctions', authenticate, requireRole('artisan'), auctionController.createAuction);
router.get('/auctions', optionalAuthenticate, auctionController.listAuctions);
router.get('/auctions/:id', optionalAuthenticate, auctionController.getAuction);
router.post('/auctions/:id/bids', authenticate, requireRole('buyer'), auctionController.placeBid);

module.exports = router;
