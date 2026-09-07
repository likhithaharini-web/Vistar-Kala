const { User, ArtisanProfile, BuyerProfile } = require('../models');
const { generateOtp, verifyOtp } = require('../utils/otpStore');
const { signToken } = require('../utils/jwt');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

// POST /auth/send-otp
const sendOtp = asyncHandler(async (req, res) => {
  const { phone } = req.body;
  if (!phone) throw new ApiError(400, 'phone is required');

  const otp = generateOtp(phone);

  const response = { success: true, message: 'OTP sent' };
  if (process.env.NODE_ENV !== 'production') {
    // Convenience for local/prototype testing only - a real SMS provider
    // would never return the code in the API response.
    response.devOtp = otp;
  }
  res.json(response);
});

// POST /auth/verify-otp
const verifyOtpHandler = asyncHandler(async (req, res) => {
  const { phone, code, name, role } = req.body;
  if (!phone || !code) throw new ApiError(400, 'phone and code are required');

  const result = verifyOtp(phone, code);
  if (!result.valid) throw new ApiError(400, result.reason);

  let user = await User.findOne({ where: { phone } });
  let isNewUser = false;

  if (!user) {
    isNewUser = true;
    user = await User.create({
      phone,
      name: name || null,
      role: ['artisan', 'buyer'].includes(role) ? role : 'buyer',
      isPhoneVerified: true,
    });

    if (user.role === 'artisan') {
      await ArtisanProfile.create({ userId: user.id });
    } else {
      await BuyerProfile.create({ userId: user.id });
    }
  } else if (!user.isPhoneVerified) {
    user.isPhoneVerified = true;
    await user.save();
  }

  const token = signToken({ userId: user.id, role: user.role });

  res.json({
    success: true,
    isNewUser,
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

module.exports = { sendOtp, verifyOtp: verifyOtpHandler, getProfile, updateProfile };
