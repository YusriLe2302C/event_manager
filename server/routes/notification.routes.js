const router = require('express').Router();
const {
  getNotifications,
  markAsRead,
  markAllRead,
  deleteNotification,
} = require('../controllers/notification.controller');
const { verifyToken } = require('../middleware/auth.middleware');

router.use(verifyToken);

// GET    /api/notifications              — paginated inbox
// PUT    /api/notifications/read-all     — mark all read
// PATCH  /api/notifications/:id/read     — mark one read
// DELETE /api/notifications/:id          — delete one

router.get('/',              getNotifications);
router.put('/read-all',      markAllRead);
router.patch('/:id/read',    markAsRead);
router.delete('/:id',        deleteNotification);

module.exports = router;
