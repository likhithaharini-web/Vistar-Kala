const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Notification = sequelize.define('Notification', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  type: {
    type: DataTypes.STRING,
    allowNull: false,
    // e.g. NEW_BID, OUTBID, AUCTION_WON, AUCTION_LOST, AUCTION_ENDING,
    // NEW_ORDER, NEW_REVERSE_OPPORTUNITY, NEW_REVERSE_BID, BID_ACCEPTED, ORDER_UPDATE
  },
  message: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  relatedEntityType: DataTypes.STRING,
  relatedEntityId: DataTypes.UUID,
  isRead: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
}, {
  tableName: 'notifications',
  timestamps: true,
});

module.exports = Notification;
