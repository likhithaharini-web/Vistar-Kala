const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const MarketPrice = sequelize.define('MarketPrice', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  category: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  material: DataTypes.STRING,
  region: DataTypes.STRING,
  comparableSellingPrice: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },
  dateCollected: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  source: {
    type: DataTypes.STRING,
    defaultValue: 'seeded/mock',
  },
  demandIndicator: {
    type: DataTypes.ENUM('LOW', 'MEDIUM', 'HIGH'),
    defaultValue: 'MEDIUM',
  },
}, {
  tableName: 'market_prices',
  timestamps: true,
});

module.exports = MarketPrice;
