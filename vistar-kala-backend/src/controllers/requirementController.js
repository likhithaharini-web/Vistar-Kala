const { Requirement, ReverseBid, User, ArtisanProfile, Order } = require('../models');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { computeMatchScore } = require('../utils/matchScore');
const { notify, notifyMany } = require('../services/notificationService');

// POST /requirements (buyer only)
const createRequirement = asyncHandler(async (req, res) => {
  const {
    productRequired,
    category,
    quantity,
    customization,
    budget,
    requiredByDate,
    deliveryLocation,
    additionalRequirements,
    referenceImageUrl,
  } = req.body;

  if (!productRequired) throw new ApiError(400, 'productRequired is required');

  const requirement = await Requirement.create({
    buyerId: req.user.id,
    productRequired,
    category,
    quantity: quantity || 1,
    customization,
    budget,
    requiredByDate,
    deliveryLocation,
    additionalRequirements,
    referenceImageUrl,
    status: 'OPEN',
  });

  // Notify artisans in the matching craft category of a new reverse-bidding opportunity.
  if (category) {
    const matchingArtisans = await ArtisanProfile.findAll({ where: { craftCategory: category } });
    await notifyMany(
      matchingArtisans.map((a) => a.userId),
      'NEW_REVERSE_OPPORTUNITY',
      `A buyer posted a new requirement for "${productRequired}" that matches your craft category.`,
      { type: 'Requirement', id: requirement.id },
    );
  }

  res.status(201).json({ success: true, requirement });
});

// GET /requirements
const listRequirements = asyncHandler(async (req, res) => {
  const { status, buyerId, category, page = 1, limit = 20 } = req.query;

  const where = {};
  if (status) where.status = status;
  if (buyerId) where.buyerId = buyerId;
  if (category) where.category = category;

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));

  const { rows, count } = await Requirement.findAndCountAll({
    where,
    limit: limitNum,
    offset: (pageNum - 1) * limitNum,
    order: [['createdAt', 'DESC']],
  });

  res.json({
    success: true,
    requirements: rows,
    pagination: { page: pageNum, limit: limitNum, total: count, totalPages: Math.ceil(count / limitNum) },
  });
});

// GET /requirements/:id
const getRequirement = asyncHandler(async (req, res) => {
  const requirement = await Requirement.findByPk(req.params.id);
  if (!requirement) throw new ApiError(404, 'Requirement not found');
  res.json({ success: true, requirement });
});

// POST /requirements/:id/bids (artisan only)
const submitReverseBid = asyncHandler(async (req, res) => {
  const requirement = await Requirement.findByPk(req.params.id);
  if (!requirement) throw new ApiError(404, 'Requirement not found');
  if (requirement.status !== 'OPEN') throw new ApiError(400, 'This requirement is no longer open for bids');

  if (req.user.role !== 'artisan') throw new ApiError(403, 'Only artisans can submit reverse bids');

  const artisanProfile = await ArtisanProfile.findOne({ where: { userId: req.user.id } });
  if (!artisanProfile) throw new ApiError(400, 'Complete your artisan profile before bidding');

  const { bidPrice, quantityFulfillable, completionTimeDays, customizationCapability, proposal, sampleUrl } = req.body;
  if (bidPrice === undefined || quantityFulfillable === undefined) {
    throw new ApiError(400, 'bidPrice and quantityFulfillable are required');
  }

  const { score } = computeMatchScore({
    requirement,
    reverseBid: { bidPrice, quantityFulfillable, completionTimeDays, customizationCapability },
    artisanProfile,
  });

  const reverseBid = await ReverseBid.create({
    requirementId: requirement.id,
    artisanId: req.user.id,
    bidPrice,
    quantityFulfillable,
    completionTimeDays,
    customizationCapability,
    proposal,
    sampleUrl,
    matchScore: score,
    status: 'SUBMITTED',
  });

  await notify(requirement.buyerId, 'NEW_REVERSE_BID', `A new artisan offer was submitted for your requirement "${requirement.productRequired}".`, {
    type: 'Requirement',
    id: requirement.id,
  });

  res.status(201).json({ success: true, reverseBid });
});

// GET /requirements/:id/bids (buyer views offers, sorted by match score)
const listReverseBids = asyncHandler(async (req, res) => {
  const requirement = await Requirement.findByPk(req.params.id);
  if (!requirement) throw new ApiError(404, 'Requirement not found');

  const bids = await ReverseBid.findAll({
    where: { requirementId: requirement.id },
    include: [{ model: User, as: 'artisan', attributes: ['id', 'name', 'phone'] }],
    order: [['matchScore', 'DESC']],
  });

  res.json({ success: true, bids });
});

// POST /requirements/:id/select-artisan (buyer only) -> creates an Order
const selectArtisan = asyncHandler(async (req, res) => {
  const requirement = await Requirement.findByPk(req.params.id);
  if (!requirement) throw new ApiError(404, 'Requirement not found');
  if (requirement.buyerId !== req.user.id) throw new ApiError(403, 'Only the requirement owner can select an artisan');
  if (requirement.status !== 'OPEN') throw new ApiError(400, 'This requirement has already been resolved');

  const { reverseBidId, shippingAddress } = req.body;
  if (!reverseBidId) throw new ApiError(400, 'reverseBidId is required');

  const selectedBid = await ReverseBid.findOne({ where: { id: reverseBidId, requirementId: requirement.id } });
  if (!selectedBid) throw new ApiError(404, 'Reverse bid not found for this requirement');

  selectedBid.status = 'SELECTED';
  await selectedBid.save();

  await ReverseBid.update(
    { status: 'REJECTED' },
    { where: { requirementId: requirement.id, id: { [require('sequelize').Op.ne]: selectedBid.id } } },
  );

  requirement.status = 'FULFILLED';
  requirement.selectedArtisanId = selectedBid.artisanId;
  await requirement.save();

  const order = await Order.create({
    buyerId: requirement.buyerId,
    artisanId: selectedBid.artisanId,
    productId: null,
    sourceType: 'REVERSE_BID',
    sourceId: selectedBid.id,
    quantity: selectedBid.quantityFulfillable,
    price: selectedBid.bidPrice,
    shippingAddress: shippingAddress || requirement.deliveryLocation,
    status: 'Confirmed',
  });

  await notify(selectedBid.artisanId, 'BID_ACCEPTED', `Your offer was accepted! An order has been created (#${order.id}).`, {
    type: 'Order',
    id: order.id,
  });

  const rejected = await ReverseBid.findAll({ where: { requirementId: requirement.id, status: 'REJECTED' } });
  await notifyMany(
    rejected.map((b) => b.artisanId),
    'BID_REJECTED',
    `Your offer for "${requirement.productRequired}" was not selected.`,
    { type: 'Requirement', id: requirement.id },
  );

  res.status(201).json({ success: true, requirement, selectedBid, order });
});

module.exports = {
  createRequirement,
  listRequirements,
  getRequirement,
  submitReverseBid,
  listReverseBids,
  selectArtisan,
};
