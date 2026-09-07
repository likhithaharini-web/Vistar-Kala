const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Auction = sequelize.define('Auction', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  productId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  artisanId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  basePrice: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },
  minBidIncrement: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 50,
  },
  startTime: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  endTime: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  quantity: {
    type: DataTypes.INTEGER,
    defaultValue: 1,
  },
  prepDeliveryTimeDays: DataTypes.INTEGER,
  status: {
    type: DataTypes.ENUM('SCHEDULED', 'ACTIVE', 'CLOSED', 'CANCELLED'),
    defaultValue: 'SCHEDULED',
  },
  highestBidAmount: {
    type: DataTypes.FLOAT,
    allowNull: true,
  },
  highestBidderId: {
    type: DataTypes.UUID,
    allowNull: true,
  },
}, {
  tableName: 'auctions',
  timestamps: true,
});

module.exports = Auction;
