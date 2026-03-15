const router = require('express').Router();
const {
  getPendingColleges,
  getCollegeProfile,
  verifyCollege,
  rejectCollege,
  reviewCollege,
  getPendingCollegeEdits,
  approveCollegeEdit,
  rejectCollegeEdit,
  getUsers,
  toggleUserStatus,
  getPendingEvents,
  approveEvent,
  rejectEvent,
  moderateEvent,
  getAdminLogs,
  getAnalytics,
  getCollegeLeaderboard,
  getPopularEvents,
  getRegistrationTrend,
} = require('../controllers/admin.controller');
const { rules, validate } = require('../middleware/validate.middleware');
const { cacheFor } = require('../middleware/cache.middleware');
const { verifyToken, requireRole } = require('../middleware/auth.middleware');

// All admin routes require a valid token + superadmin role
router.use(verifyToken, requireRole('superadmin'));

router.get('/colleges/pending',              cacheFor(60), getPendingColleges);
router.get('/colleges/pending-edits',        getPendingCollegeEdits);
router.get('/colleges/:id/profile',          getCollegeProfile);
router.patch('/colleges/:id/verify',         verifyCollege);
router.patch('/colleges/:id/reject',         rules.rejectCollege, validate, rejectCollege);
router.put('/colleges/:id/review',           reviewCollege);
router.patch('/colleges/:id/approve-edit',   approveCollegeEdit);
router.patch('/colleges/:id/reject-edit',    rejectCollegeEdit);

router.get('/users',               getUsers);
router.put('/users/:id/toggle',    toggleUserStatus);

router.get('/events/pending',        cacheFor(60), getPendingEvents);
router.patch('/events/:id/approve',  approveEvent);
router.patch('/events/:id/reject',   rules.rejectEvent, validate, rejectEvent);
router.put('/events/:id/moderate',   moderateEvent);

router.get('/logs',                getAdminLogs);

router.get('/analytics',                    cacheFor(300), getAnalytics);
router.get('/analytics/colleges',           cacheFor(300), getCollegeLeaderboard);
router.get('/analytics/events',             cacheFor(300), getPopularEvents);
router.get('/analytics/registrations/trend',cacheFor(180), getRegistrationTrend);

module.exports = router;
