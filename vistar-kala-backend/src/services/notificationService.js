const { Notification } = require('../models');

let io = null;

// Called once from server.js after Socket.IO is initialized.
function attachIO(ioInstance) {
  io = ioInstance;
}

/**
 * Creates a persisted notification for a user and pushes it in real time
 * over Socket.IO (room = userId) if a socket server is attached.
 */
async function notify(userId, type, message, related = {}) {
  const notification = await Notification.create({
    userId,
    type,
    message,
    relatedEntityType: related.type || null,
    relatedEntityId: related.id || null,
  });

  if (io) {
    io.to(`user:${userId}`).emit('notification', {
      id: notification.id,
      type: notification.type,
      message: notification.message,
      relatedEntityType: notification.relatedEntityType,
      relatedEntityId: notification.relatedEntityId,
      createdAt: notification.createdAt,
    });
  }

  return notification;
}

async function notifyMany(userIds, type, message, related = {}) {
  return Promise.all([...new Set(userIds)].filter(Boolean).map((uid) => notify(uid, type, message, related)));
}

module.exports = { attachIO, notify, notifyMany };
