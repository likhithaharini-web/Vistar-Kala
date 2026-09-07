const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Bid = sequelize.define('Bid', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  auctionId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  bidderId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  amount: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('ACTIVE', 'OUTBID', 'WON', 'LOST'),
    defaultValue: 'ACTIVE',
  },
}, {
  tableName: 'bids',
  timestamps: true,
});

module.exports = Bid;
