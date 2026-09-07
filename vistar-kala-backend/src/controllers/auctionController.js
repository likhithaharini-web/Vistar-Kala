const { Auction, Bid, Product, User } = require('../models');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { notify } = require('../services/notificationService');

// POST /auctions (artisan only, must own the product)
const createAuction = asyncHandler(async (req, res) => {
  const { productId, basePrice, minBidIncrement, startTime, endTime, quantity, prepDeliveryTimeDays } = req.body;

  if (!productId || basePrice === undefined || !startTime || !endTime) {
    throw new ApiError(400, 'productId, basePrice, startTime and endTime are required');
  }

  const product = await Product.findByPk(productId);
  if (!product) throw new ApiError(404, 'Product not found');
  if (product.artisanId !== req.user.id) {
    throw new ApiError(403, 'You can only auction your own products');
  }

  if (new Date(endTime) <= new Date(startTime)) {
    throw new ApiError(400, 'endTime must be after startTime');
  }

  const status = new Date(startTime) <= new Date() ? 'ACTIVE' : 'SCHEDULED';

  const auction = await Auction.create({
    productId,
    artisanId: req.user.id,
    basePrice,
    minBidIncrement: minBidIncrement || 50,
    startTime,
    endTime,
    quantity: quantity || product.quantity || 1,
    prepDeliveryTimeDays,
    status,
  });

  res.status(201).json({ success: true, auction });
});

function computeEffectiveStatus(auction) {
  if (auction.status === 'CANCELLED') return 'CANCELLED';
  const now = Date.now();
  if (now >= new Date(auction.endTime).getTime()) return 'CLOSED';
  if (now >= new Date(auction.startTime).getTime()) return 'ACTIVE';
  return 'SCHEDULED';
}

// GET /auctions
const listAuctions = asyncHandler(async (req, res) => {
  const { status, productId, artisanId, page = 1, limit = 20 } = req.query;

  const where = {};
  if (productId) where.productId = productId;
  if (artisanId) where.artisanId = artisanId;

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));

  const { rows, count } = await Auction.findAndCountAll({
    where,
    include: [{ model: Product, as: 'product' }],
    limit: limitNum,
    offset: (pageNum - 1) * limitNum,
    order: [['endTime', 'ASC']],
  });

  let auctions = rows.map((a) => {
    const plain = a.toJSON();
    plain.effectiveStatus = computeEffectiveStatus(a);
    return plain;
  });

  if (status) {
    auctions = auctions.filter((a) => a.effectiveStatus === status);
  }

  res.json({
    success: true,
    auctions,
    pagination: { page: pageNum, limit: limitNum, total: count, totalPages: Math.ceil(count / limitNum) },
  });
});

// GET /auctions/:id
const getAuction = asyncHandler(async (req, res) => {
  const auction = await Auction.findByPk(req.params.id, {
    include: [
      { model: Product, as: 'product' },
      { model: Bid, as: 'bids', include: [{ model: User, as: 'bidder', attributes: ['id', 'name', 'phone'] }] },
    ],
  });
  if (!auction) throw new ApiError(404, 'Auction not found');

  const plain = auction.toJSON();
  plain.effectiveStatus = computeEffectiveStatus(auction);
  plain.bids = plain.bids.sort((a, b) => b.amount - a.amount);

  res.json({ success: true, auction: plain });
});

// POST /auctions/:id/bids (buyer only)
const placeBid = asyncHandler(async (req, res) => {
  const auction = await Auction.findByPk(req.params.id);
  if (!auction) throw new ApiError(404, 'Auction not found');

  const effectiveStatus = computeEffectiveStatus(auction);
  if (effectiveStatus !== 'ACTIVE') {
    throw new ApiError(400, `Auction is not active (current status: ${effectiveStatus})`);
  }

  if (req.user.role !== 'buyer') {
    throw new ApiError(403, 'Only buyers can place bids');
  }

  const { amount } = req.body;
  if (amount === undefined) throw new ApiError(400, 'amount is required');

  const minAcceptable = (auction.highestBidAmount || auction.basePrice) + (auction.highestBidAmount ? auction.minBidIncrement : 0);

  if (amount < minAcceptable) {
    throw new ApiError(
      400,
      `Bid must be at least ${minAcceptable} (base price ${auction.basePrice}, min increment ${auction.minBidIncrement})`,
    );
  }

  const previousHighestBidderId = auction.highestBidderId;

  const bid = await Bid.create({ auctionId: auction.id, bidderId: req.user.id, amount, status: 'ACTIVE' });

  if (previousHighestBidderId && previousHighestBidderId !== req.user.id) {
    await Bid.update(
      { status: 'OUTBID' },
      { where: { auctionId: auction.id, bidderId: previousHighestBidderId, status: 'ACTIVE' } },
    );
    await notify(previousHighestBidderId, 'OUTBID', `You've been outbid on an auction. New highest bid: ${amount}.`, {
      type: 'Auction',
      id: auction.id,
    });
  }

  auction.highestBidAmount = amount;
  auction.highestBidderId = req.user.id;
  auction.status = 'ACTIVE';
  await auction.save();

  await notify(auction.artisanId, 'NEW_BID', `New bid of ${amount} placed on your auction.`, {
    type: 'Auction',
    id: auction.id,
  });

  res.status(201).json({ success: true, bid, auction });
});

// Called by the periodic background job in server.js to auto-close ended auctions.
async function autoCloseExpiredAuctions() {
  const now = new Date();
  const expired = await Auction.findAll({
    where: { status: ['ACTIVE', 'SCHEDULED'] },
  });

  for (const auction of expired) {
    if (new Date(auction.endTime) <= now) {
      auction.status = 'CLOSED';
      await auction.save();

      if (auction.highestBidderId) {
        await Bid.update(
          { status: 'WON' },
          { where: { auctionId: auction.id, bidderId: auction.highestBidderId } },
        );
        await Bid.update(
          { status: 'LOST' },
          { where: { auctionId: auction.id, bidderId: { [require('sequelize').Op.ne]: auction.highestBidderId } } },
        );
        await notify(auction.highestBidderId, 'AUCTION_WON', `Congratulations! You won the auction with a bid of ${auction.highestBidAmount}.`, {
          type: 'Auction',
          id: auction.id,
        });
        await notify(auction.artisanId, 'AUCTION_ENDED', `Your auction closed. Winning bid: ${auction.highestBidAmount}.`, {
          type: 'Auction',
          id: auction.id,
        });
      } else {
        await notify(auction.artisanId, 'AUCTION_ENDED', 'Your auction closed with no bids.', {
          type: 'Auction',
          id: auction.id,
        });
      }
    } else if (auction.status === 'SCHEDULED' && new Date(auction.startTime) <= now) {
      auction.status = 'ACTIVE';
      await auction.save();
    }
  }
}

module.exports = { createAuction, listAuctions, getAuction, placeBid, autoCloseExpiredAuctions, computeEffectiveStatus };
