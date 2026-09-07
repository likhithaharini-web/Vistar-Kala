require('dotenv').config();
const bcrypt = require('bcryptjs');
const {
  sequelize,
  User,
  ArtisanProfile,
  BuyerProfile,
  MarketPrice,
  Product,
} = require('./models');

async function seed() {
  await sequelize.sync();

  const defaultPassword = 'DevPass123!';
  const defaultPasswordHash = await bcrypt.hash(defaultPassword, 12);

  // --- Demo users ---
  const [admin, adminCreated] = await User.findOrCreate({
    where: { phone: '+910000000001' },
    defaults: { name: 'Admin', role: 'admin', passwordHash: defaultPasswordHash, isPhoneVerified: true },
  });
  if (!adminCreated && !admin.passwordHash) {
    admin.passwordHash = defaultPasswordHash;
    await admin.save();
  }

  const [artisanUser, artisanCreated] = await User.findOrCreate({
    where: { phone: '+910000000002' },
    defaults: { name: 'Rukmini Devi', role: 'artisan', passwordHash: defaultPasswordHash, isPhoneVerified: true },
  });
  if (!artisanCreated && !artisanUser.passwordHash) {
    artisanUser.passwordHash = defaultPasswordHash;
    await artisanUser.save();
  }
  await ArtisanProfile.findOrCreate({
    where: { userId: artisanUser.id },
    defaults: {
      location: 'Pochampally, Telangana',
      craftCategory: 'Handloom Sarees',
      experienceYears: 15,
      verificationStatus: 'VERIFIED',
      rating: 4.6,
    },
  });

  const [buyerUser, buyerCreated] = await User.findOrCreate({
    where: { phone: '+910000000003' },
    defaults: { name: 'Anika Sharma', role: 'buyer', passwordHash: defaultPasswordHash, isPhoneVerified: true },
  });
  if (!buyerCreated && !buyerUser.passwordHash) {
    buyerUser.passwordHash = defaultPasswordHash;
    await buyerUser.save();
  }
  await BuyerProfile.findOrCreate({
    where: { userId: buyerUser.id },
    defaults: { companyName: 'Anika Boutique', buyerType: 'retailer', location: 'Mumbai, Maharashtra' },
  });

  // --- Sample published product ---
  const [product] = await Product.findOrCreate({
    where: { name: 'Handwoven Pochampally Ikat Saree', artisanId: artisanUser.id },
    defaults: {
      category: 'Handloom Sarees',
      material: 'Silk',
      craftType: 'Ikat',
      origin: 'Pochampally, Telangana',
      description: 'A traditional handwoven Ikat silk saree.',
      englishDescription: 'A traditional handwoven Ikat silk saree, dyed and woven using centuries-old techniques.',
      hindiDescription: 'यह एक पारंपरिक हस्तनिर्मित इकत सिल्क साड़ी है।',
      keywords: 'ikat,silk,handloom,saree,pochampally',
      quantity: 5,
      dimensions: '5.5m x 1.2m',
      productionTimeDays: 20,
      customizationAvailable: true,
      isHandmade: true,
      isGI: true,
      price: 4500,
      status: 'PUBLISHED',
      authenticationStatus: 'VERIFIED',
    },
  });

  // --- Seeded/mock market price data (PRD section 7 / prototype scope) ---
  const marketSamples = [
    { category: 'Handloom Sarees', material: 'Silk', region: 'Telangana', comparableSellingPrice: 4200, source: 'seeded/mock', demandIndicator: 'HIGH' },
    { category: 'Handloom Sarees', material: 'Silk', region: 'Telangana', comparableSellingPrice: 4800, source: 'seeded/mock', demandIndicator: 'HIGH' },
    { category: 'Handloom Sarees', material: 'Silk', region: 'Telangana', comparableSellingPrice: 3900, source: 'seeded/mock', demandIndicator: 'MEDIUM' },
    { category: 'Pottery', material: 'Terracotta', region: 'Rajasthan', comparableSellingPrice: 850, source: 'seeded/mock', demandIndicator: 'MEDIUM' },
    { category: 'Pottery', material: 'Terracotta', region: 'Rajasthan', comparableSellingPrice: 1000, source: 'seeded/mock', demandIndicator: 'MEDIUM' },
    { category: 'Wood Carving', material: 'Sheesham Wood', region: 'Uttar Pradesh', comparableSellingPrice: 2200, source: 'seeded/mock', demandIndicator: 'LOW' },
    { category: 'Jewellery', material: 'Silver', region: 'Rajasthan', comparableSellingPrice: 3200, source: 'seeded/mock', demandIndicator: 'HIGH' },
  ];

  for (const sample of marketSamples) {
    await MarketPrice.create({ ...sample, dateCollected: new Date() });
  }

  // eslint-disable-next-line no-console
  console.log('Seed complete.');
  // eslint-disable-next-line no-console
  console.log({
    admin: { phone: admin.phone, password: defaultPassword, role: 'admin' },
    artisan: { phone: artisanUser.phone, password: defaultPassword, role: 'artisan' },
    buyer: { phone: buyerUser.phone, password: defaultPassword, role: 'buyer' },
    note: 'Log in with POST /api/auth/login using phone & password.',
    sampleProductId: product.id,
  });

  process.exit(0);
}

seed().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Seed failed:', err);
  process.exit(1);
});
