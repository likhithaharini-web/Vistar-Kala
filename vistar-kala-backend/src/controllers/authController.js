const bcrypt = require('bcryptjs');
const { User, ArtisanProfile, BuyerProfile } = require('../models');
const { signToken } = require('../utils/jwt');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

// POST /auth/register
const register = asyncHandler(async (req, res) => {
  const { phone, password, name, role } = req.body;
  if (!phone || !password) {
    throw new ApiError(400, 'phone and password are required');
  }

  if (typeof password !== 'string' || password.length < 8) {
    throw new ApiError(400, 'password must be at least 8 characters long');
  }

  const existing = await User.findOne({ where: { phone } });
  if (existing) {
    throw new ApiError(409, 'Phone number is already registered');
  }

  // Security: Do not allow public creation of admin account
  const sanitizedRole = role === 'artisan' ? 'artisan' : 'buyer';

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await User.create({
    phone,
    passwordHash,
    name: name || null,
    role: sanitizedRole,
    isPhoneVerified: true,
  });

  if (user.role === 'artisan') {
    await ArtisanProfile.create({ userId: user.id });
  } else {
    await BuyerProfile.create({ userId: user.id });
  }

  const token = signToken({ userId: user.id, role: user.role });

  res.status(201).json({
    success: true,
    token,
    user: {
      id: user.id,
      phone: user.phone,
      name: user.name,
      role: user.role,
      languagePreference: user.languagePreference,
    },
  });
});

// POST /auth/login
const login = asyncHandler(async (req, res) => {
  const { phone, password } = req.body;
  if (!phone || !password) {
    throw new ApiError(400, 'phone and password are required');
  }

  const user = await User.findOne({ where: { phone } });
  if (!user || !user.passwordHash) {
    throw new ApiError(401, 'Invalid phone number or password');
  }

  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) {
    throw new ApiError(401, 'Invalid phone number or password');
  }

  const token = signToken({ userId: user.id, role: user.role });

  res.json({
    success: true,
    token,
    user: {
      id: user.id,
      phone: user.phone,
      name: user.name,
      role: user.role,
      languagePreference: user.languagePreference,
    },
  });
});

// GET /user/profile
const getProfile = asyncHandler(async (req, res) => {
  const user = req.user;
  let profile = null;
  if (user.role === 'artisan') {
    profile = await ArtisanProfile.findOne({ where: { userId: user.id } });
  } else if (user.role === 'buyer') {
    profile = await BuyerProfile.findOne({ where: { userId: user.id } });
  }

  res.json({
    success: true,
    user: {
      id: user.id,
      phone: user.phone,
      name: user.name,
      role: user.role,
      languagePreference: user.languagePreference,
      isPhoneVerified: user.isPhoneVerified,
    },
    profile,
  });
});

// PUT /user/profile
const updateProfile = asyncHandler(async (req, res) => {
  const user = req.user;
  const { name, languagePreference, artisan, buyer } = req.body;

  if (name !== undefined) user.name = name;
  if (languagePreference !== undefined) user.languagePreference = languagePreference;
  await user.save();

  let profile = null;
  if (user.role === 'artisan' && artisan) {
    profile = await ArtisanProfile.findOne({ where: { userId: user.id } });
    if (!profile) profile = await ArtisanProfile.create({ userId: user.id });
    const { location, craftCategory, experienceYears, certificationsSummary } = artisan;
    if (location !== undefined) profile.location = location;
    if (craftCategory !== undefined) profile.craftCategory = craftCategory;
    if (experienceYears !== undefined) profile.experienceYears = experienceYears;
    if (certificationsSummary !== undefined) profile.certificationsSummary = certificationsSummary;
    await profile.save();
  } else if (user.role === 'buyer' && buyer) {
    profile = await BuyerProfile.findOne({ where: { userId: user.id } });
    if (!profile) profile = await BuyerProfile.create({ userId: user.id });
    const { companyName, buyerType, location } = buyer;
    if (companyName !== undefined) profile.companyName = companyName;
    if (buyerType !== undefined) profile.buyerType = buyerType;
    if (location !== undefined) profile.location = location;
    await profile.save();
  }

  res.json({
    success: true,
    user: {
      id: user.id,
      phone: user.phone,
      name: user.name,
      role: user.role,
      languagePreference: user.languagePreference,
    },
    profile,
  });
});

module.exports = { register, login, getProfile, updateProfile };
