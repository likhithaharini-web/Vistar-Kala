const {
  User,
  ArtisanProfile,
  Certification,
  Product,
  Auction,
  Requirement,
  Order,
  MarketPrice,
} = require('../models');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { notify } = require('../services/notificationService');

// --- Artisan verification ---

// GET /admin/artisans?status=PENDING
const listArtisans = asyncHandler(async (req, res) => {
  const where = {};
  if (req.query.status) where.verificationStatus = req.query.status;
  const artisans = await ArtisanProfile.findAll({
    where,
    include: [{ model: User, as: 'user', attributes: ['id', 'name', 'phone'] }],
  });
  res.json({ success: true, artisans });
});

// PUT /admin/artisans/:id/verify  { status: 'VERIFIED' | 'NOT_VERIFIED' | 'PENDING' | 'NOT_APPLICABLE' }
const verifyArtisan = asyncHandler(async (req, res) => {
  const profile = await ArtisanProfile.findByPk(req.params.id);
  if (!profile) throw new ApiError(404, 'Artisan profile not found');

  const { status } = req.body;
  const valid = ['VERIFIED', 'PENDING', 'NOT_VERIFIED', 'NOT_APPLICABLE'];
  if (!valid.includes(status)) throw new ApiError(400, `status must be one of: ${valid.join(', ')}`);

  profile.verificationStatus = status;
  await profile.save();

  await notify(profile.userId, 'VERIFICATION_UPDATE', `Your artisan verification status is now: ${status}.`, {
    type: 'ArtisanProfile',
    id: profile.id,
  });

  res.json({ success: true, profile });
});

// --- Certification review ---

// GET /admin/certifications?status=PENDING
const listCertifications = asyncHandler(async (req, res) => {
  const where = {};
  if (req.query.status) where.verificationStatus = req.query.status;
  const certifications = await Certification.findAll({ where });
  res.json({ success: true, certifications });
});

// PUT /admin/certifications/:id/review
const reviewCertification = asyncHandler(async (req, res) => {
  const cert = await Certification.findByPk(req.params.id);
  if (!cert) throw new ApiError(404, 'Certification not found');

  const { status, verificationSource } = req.body;
  const valid = ['VERIFIED', 'PENDING', 'NOT_VERIFIED', 'NOT_APPLICABLE'];
  if (!valid.includes(status)) throw new ApiError(400, `status must be one of: ${valid.join(', ')}`);

  cert.verificationStatus = status;
  cert.verificationDate = new Date();
  if (verificationSource) cert.verificationSource = verificationSource;
  await cert.save();

  res.json({ success: true, certification: cert });
});

// --- Reported products ---

// GET /admin/products/reported
const listReportedProducts = asyncHandler(async (req, res) => {
  const products = await Product.findAll({ where: { isReported: true } });
  res.json({ success: true, products });
});

// PUT /admin/products/:id/resolve-report  { action: 'unpublish' | 'dismiss' }
const resolveProductReport = asyncHandler(async (req, res) => {
  const product = await Product.findByPk(req.params.id);
  if (!product) throw new ApiError(404, 'Product not found');

  const { action } = req.body;
  if (action === 'unpublish') {
    product.status = 'UNPUBLISHED';
  }
  product.isReported = false;
  await product.save();

  res.json({ success: true, product });
});

// --- Monitoring ---

// GET /admin/auctions
const monitorAuctions = asyncHandler(async (req, res) => {
  const auctions = await Auction.findAll({ include: [{ model: Product, as: 'product' }], order: [['createdAt', 'DESC']] });
  res.json({ success: true, auctions });
});

// GET /admin/requirements
const monitorRequirements = asyncHandler(async (req, res) => {
  const requirements = await Requirement.findAll({ order: [['createdAt', 'DESC']] });
  res.json({ success: true, requirements });
});

// --- User management ---

// GET /admin/users
const listUsers = asyncHandler(async (req, res) => {
  const where = {};
  if (req.query.role) where.role = req.query.role;
  const users = await User.findAll({
    where,
    attributes: ['id', 'phone', 'name', 'role', 'languagePreference', 'isPhoneVerified', 'createdAt'],
  });
  res.json({ success: true, users });
});

// PUT /admin/users/:id/role  { role: 'artisan' | 'buyer' | 'admin' }
const updateUserRole = asyncHandler(async (req, res) => {
  const user = await User.findByPk(req.params.id);
  if (!user) throw new ApiError(404, 'User not found');

  const { role } = req.body;
  if (!['artisan', 'buyer', 'admin'].includes(role)) throw new ApiError(400, 'Invalid role');

  user.role = role;
  await user.save();

  if (role === 'artisan') {
    const existing = await ArtisanProfile.findOne({ where: { userId: user.id } });
    if (!existing) await ArtisanProfile.create({ userId: user.id });
  }

  res.json({ success: true, user });
});

// --- Dispute resolution (orders) ---

// PUT /admin/disputes/:orderId/resolve  { resolutionNote, status }
const resolveDispute = asyncHandler(async (req, res) => {
  const order = await Order.findByPk(req.params.orderId);
  if (!order) throw new ApiError(404, 'Order not found');

  const { status, resolutionNote } = req.body;
  if (status) order.status = status;
  if (resolutionNote) order.deliveryInfo = `${order.deliveryInfo ? order.deliveryInfo + ' | ' : ''}Dispute resolution: ${resolutionNote}`;
  await order.save();

  await notify(order.buyerId, 'DISPUTE_RESOLVED', 'An admin has resolved the dispute on your order.', { type: 'Order', id: order.id });
  await notify(order.artisanId, 'DISPUTE_RESOLVED', 'An admin has resolved a dispute on an order.', { type: 'Order', id: order.id });

  res.json({ success: true, order });
});

// --- Market price data management ---

// GET /admin/market-prices
const listMarketPrices = asyncHandler(async (req, res) => {
  const where = {};
  ['category', 'material', 'region'].forEach((f) => {
    if (req.query[f]) where[f] = req.query[f];
  });
  const marketPrices = await MarketPrice.findAll({ where, order: [['dateCollected', 'DESC']] });
  res.json({ success: true, marketPrices });
});

// POST /admin/market-prices
const createMarketPrice = asyncHandler(async (req, res) => {
  const { category, material, region, comparableSellingPrice, source, demandIndicator, dateCollected } = req.body;
  if (!category || comparableSellingPrice === undefined) {
    throw new ApiError(400, 'category and comparableSellingPrice are required');
  }
  const marketPrice = await MarketPrice.create({
    category,
    material,
    region,
    comparableSellingPrice,
    source,
    demandIndicator,
    dateCollected: dateCollected || new Date(),
  });
  res.status(201).json({ success: true, marketPrice });
});

// PUT /admin/market-prices/:id
const updateMarketPrice = asyncHandler(async (req, res) => {
  const marketPrice = await MarketPrice.findByPk(req.params.id);
  if (!marketPrice) throw new ApiError(404, 'Market price entry not found');

  ['category', 'material', 'region', 'comparableSellingPrice', 'source', 'demandIndicator', 'dateCollected'].forEach((f) => {
    if (req.body[f] !== undefined) marketPrice[f] = req.body[f];
  });
  await marketPrice.save();
  res.json({ success: true, marketPrice });
});

// DELETE /admin/market-prices/:id
const deleteMarketPrice = asyncHandler(async (req, res) => {
  const marketPrice = await MarketPrice.findByPk(req.params.id);
  if (!marketPrice) throw new ApiError(404, 'Market price entry not found');
  await marketPrice.destroy();
  res.json({ success: true, message: 'Market price entry deleted' });
});

module.exports = {
  listArtisans,
  verifyArtisan,
  listCertifications,
  reviewCertification,
  listReportedProducts,
  resolveProductReport,
  monitorAuctions,
  monitorRequirements,
  listUsers,
  updateUserRole,
  resolveDispute,
  listMarketPrices,
  createMarketPrice,
  updateMarketPrice,
  deleteMarketPrice,
};
