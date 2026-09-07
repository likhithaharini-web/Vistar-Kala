const sequelize = require('../config/database');

const User = require('./User');
const ArtisanProfile = require('./ArtisanProfile');
const BuyerProfile = require('./BuyerProfile');
const Product = require('./Product');
const ProductImage = require('./ProductImage');
const Certification = require('./Certification');
const MarketPrice = require('./MarketPrice');
const PriceAnalysis = require('./PriceAnalysis');
const Auction = require('./Auction');
const Bid = require('./Bid');
const Requirement = require('./Requirement');
const ReverseBid = require('./ReverseBid');
const Order = require('./Order');
const Notification = require('./Notification');

// User <-> ArtisanProfile / BuyerProfile
User.hasOne(ArtisanProfile, { foreignKey: 'userId', as: 'artisanProfile', onDelete: 'CASCADE' });
ArtisanProfile.belongsTo(User, { foreignKey: 'userId', as: 'user' });

User.hasOne(BuyerProfile, { foreignKey: 'userId', as: 'buyerProfile', onDelete: 'CASCADE' });
BuyerProfile.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// Product <-> Artisan (User)
User.hasMany(Product, { foreignKey: 'artisanId', as: 'products' });
Product.belongsTo(User, { foreignKey: 'artisanId', as: 'artisan' });

// Product <-> ProductImage
Product.hasMany(ProductImage, { foreignKey: 'productId', as: 'images', onDelete: 'CASCADE' });
ProductImage.belongsTo(Product, { foreignKey: 'productId' });

// Product <-> Certification
Product.hasMany(Certification, { foreignKey: 'productId', as: 'certifications', onDelete: 'CASCADE' });
Certification.belongsTo(Product, { foreignKey: 'productId' });

// Product <-> PriceAnalysis
Product.hasMany(PriceAnalysis, { foreignKey: 'productId', as: 'priceAnalyses' });
PriceAnalysis.belongsTo(Product, { foreignKey: 'productId' });

// Product <-> Auction
Product.hasMany(Auction, { foreignKey: 'productId', as: 'auctions' });
Auction.belongsTo(Product, { foreignKey: 'productId', as: 'product' });
User.hasMany(Auction, { foreignKey: 'artisanId', as: 'auctions' });
Auction.belongsTo(User, { foreignKey: 'artisanId', as: 'artisan' });

// Auction <-> Bid
Auction.hasMany(Bid, { foreignKey: 'auctionId', as: 'bids', onDelete: 'CASCADE' });
Bid.belongsTo(Auction, { foreignKey: 'auctionId', as: 'auction' });
User.hasMany(Bid, { foreignKey: 'bidderId', as: 'bids' });
Bid.belongsTo(User, { foreignKey: 'bidderId', as: 'bidder' });

// Requirement <-> Buyer (User)
User.hasMany(Requirement, { foreignKey: 'buyerId', as: 'requirements' });
Requirement.belongsTo(User, { foreignKey: 'buyerId', as: 'buyer' });

// Requirement <-> ReverseBid
Requirement.hasMany(ReverseBid, { foreignKey: 'requirementId', as: 'reverseBids', onDelete: 'CASCADE' });
ReverseBid.belongsTo(Requirement, { foreignKey: 'requirementId', as: 'requirement' });
User.hasMany(ReverseBid, { foreignKey: 'artisanId', as: 'reverseBids' });
ReverseBid.belongsTo(User, { foreignKey: 'artisanId', as: 'artisan' });

// Order associations
User.hasMany(Order, { foreignKey: 'buyerId', as: 'ordersAsBuyer' });
Order.belongsTo(User, { foreignKey: 'buyerId', as: 'buyer' });
User.hasMany(Order, { foreignKey: 'artisanId', as: 'ordersAsArtisan' });
Order.belongsTo(User, { foreignKey: 'artisanId', as: 'artisan' });
Product.hasMany(Order, { foreignKey: 'productId', as: 'orders' });
Order.belongsTo(Product, { foreignKey: 'productId', as: 'product' });

// Notification
User.hasMany(Notification, { foreignKey: 'userId', as: 'notifications' });
Notification.belongsTo(User, { foreignKey: 'userId', as: 'user' });

module.exports = {
  sequelize,
  User,
  ArtisanProfile,
  BuyerProfile,
  Product,
  ProductImage,
  Certification,
  MarketPrice,
  PriceAnalysis,
  Auction,
  Bid,
  Requirement,
  ReverseBid,
  Order,
  Notification,
};
