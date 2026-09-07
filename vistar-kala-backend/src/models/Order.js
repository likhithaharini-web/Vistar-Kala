const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Order = sequelize.define('Order', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  buyerId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  artisanId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  productId: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  sourceType: {
    type: DataTypes.ENUM('AUCTION', 'REVERSE_BID', 'DIRECT'),
    defaultValue: 'DIRECT',
  },
  sourceId: {
    type: DataTypes.UUID,
    allowNull: true, // auctionId or reverseBidId, depending on sourceType
  },
  quantity: {
    type: DataTypes.INTEGER,
    defaultValue: 1,
  },
  price: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },
  paymentStatus: {
    type: DataTypes.ENUM('PENDING', 'PAID', 'FAILED', 'REFUNDED'),
    defaultValue: 'PENDING',
  },
  shippingAddress: DataTypes.STRING,
  status: {
    type: DataTypes.ENUM('Confirmed', 'In Production', 'Ready', 'Shipped', 'Delivered', 'Cancelled'),
    defaultValue: 'Confirmed',
  },
  deliveryInfo: DataTypes.STRING,
}, {
  tableName: 'orders',
  timestamps: true,
});

module.exports = Order;
