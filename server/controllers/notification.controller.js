const Notification = require('../models/Notification.model');
const ApiError     = require('../utils/ApiError');
const ApiResponse  = require('../utils/ApiResponse');

// GET /api/notifications?page=1&limit=30&unreadOnly=false
const getNotifications = async (req, res, next) => {
  try {
    const { page = 1, limit = 30, unreadOnly } = req.query;
    const skip   = (page - 1) * limit;
    const filter = { recipient: req.user.id };
    if (unreadOnly === 'true') filter.read = false;

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .populate('relatedEvent',   'title type startDate')
        .populate('relatedCollege', 'name')
        .lean(),
      Notification.countDocuments({ recipient: req.user.id }),
      Notification.countDocuments({ recipient: req.user.id, read: false }),
    ]);

    ApiResponse.paginated(res, 'Notifications fetched', notifications, {
      total,
      unreadCount,
      page:  Number(page),
      limit: Number(limit),
      pages: Math.ceil(total / limit),
    });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/notifications/:id/read
const markAsRead = async (req, res, next) => {
  try {
    const n = await Notification.findOneAndUpdate(
      { _id: req.params.id, recipient: req.user.id },
      { read: true },
      { new: true }
    );
    if (!n) throw ApiError.notFound('Notification not found');
    ApiResponse.success(res, 'Marked as read', { id: n._id, read: n.read });
  } catch (err) {
    next(err);
  }
};

// PUT /api/notifications/read-all
const markAllRead = async (req, res, next) => {
  try {
    const { modifiedCount } = await Notification.updateMany(
      { recipient: req.user.id, read: false },
      { read: true }
    );
    ApiResponse.success(res, 'All notifications marked as read', { updated: modifiedCount });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/notifications/:id
const deleteNotification = async (req, res, next) => {
  try {
    const n = await Notification.findOneAndDelete({
      _id:       req.params.id,
      recipient: req.user.id,
    });
    if (!n) throw ApiError.notFound('Notification not found');
    ApiResponse.success(res, 'Notification deleted');
  } catch (err) {
    next(err);
  }
};

module.exports = { getNotifications, markAsRead, markAllRead, deleteNotification };
