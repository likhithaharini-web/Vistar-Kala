const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const BuyerProfile = sequelize.define('BuyerProfile', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    unique: true,
  },
  companyName: DataTypes.STRING,
  buyerType: {
    type: DataTypes.ENUM('individual', 'retailer', 'exporter', 'other'),
    defaultValue: 'individual',
  },
  location: DataTypes.STRING,
}, {
  tableName: 'buyer_profiles',
  timestamps: true,
});

module.exports = BuyerProfile;
