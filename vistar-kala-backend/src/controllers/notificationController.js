const { Notification } = require('../models');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

// GET /notifications
const listNotifications = asyncHandler(async (req, res) => {
  const { unreadOnly, page = 1, limit = 20 } = req.query;
  const where = { userId: req.user.id };
  if (unreadOnly === 'true') where.isRead = false;

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));

  const { rows, count } = await Notification.findAndCountAll({
    where,
    limit: limitNum,
    offset: (pageNum - 1) * limitNum,
    order: [['createdAt', 'DESC']],
  });

  res.json({
    success: true,
    notifications: rows,
    pagination: { page: pageNum, limit: limitNum, total: count, totalPages: Math.ceil(count / limitNum) },
  });
});

// PUT /notifications/:id/read
const markRead = asyncHandler(async (req, res) => {
  const notification = await Notification.findByPk(req.params.id);
  if (!notification) throw new ApiError(404, 'Notification not found');
  if (notification.userId !== req.user.id) throw new ApiError(403, 'Not authorized');

  notification.isRead = true;
  await notification.save();
  res.json({ success: true, notification });
});

// PUT /notifications/read-all
const markAllRead = asyncHandler(async (req, res) => {
  await Notification.update({ isRead: true }, { where: { userId: req.user.id, isRead: false } });
  res.json({ success: true, message: 'All notifications marked as read' });
});

module.exports = { listNotifications, markRead, markAllRead };
