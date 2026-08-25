const Notification = require('../models/Notification');
const { success, error } = require('../utils/response');

// GET /api/notifications
// Returns all unread + last 20 read, sorted newest first
const getNotifications = async (req, res, next) => {
  try {
    const unread = await Notification.find({ userId: req.user._id, isRead: false })
      .sort({ createdAt: -1 });

    const read = await Notification.find({ userId: req.user._id, isRead: true })
      .sort({ createdAt: -1 })
      .limit(20);

    const notifications = [...unread, ...read].sort(
      (a, b) => b.createdAt - a.createdAt
    );

    return success(res, {
      notifications,
      unreadCount: unread.length,
      total: notifications.length,
    });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/notifications/mark-all-read
const markAllRead = async (req, res, next) => {
  try {
    const result = await Notification.updateMany(
      { userId: req.user._id, isRead: false },
      { isRead: true }
    );

    return success(res, { modifiedCount: result.modifiedCount }, 'All notifications marked as read');
  } catch (err) {
    next(err);
  }
};

// PATCH /api/notifications/:id
const markRead = async (req, res, next) => {
  try {
    const { id } = req.params;

    const notification = await Notification.findOneAndUpdate(
      { _id: id, userId: req.user._id },
      { isRead: true },
      { new: true }
    );

    if (!notification) {
      return error(res, 'Notification not found', 404);
    }

    return success(res, { notification });
  } catch (err) {
    next(err);
  }
};

module.exports = { getNotifications, markRead, markAllRead };
