const router = require('express').Router();
const {
  checkRegistrationStatus,
  registerForEvent,
  cancelRegistration,
  getMyRegistrations,
  getEventRegistrations,
  closeRegistration,
  checkInAttendee,
  exportAttendees,
  updateSeatLimit,
} = require('../controllers/registration.controller');
const { verifyToken, requireRole } = require('../middleware/auth.middleware');
const { rules, validate }          = require('../middleware/validate.middleware');

router.use(verifyToken);

// ── Student routes ─────────────────────────────────────────────────
router.get('/my',
  requireRole('student'),
  getMyRegistrations
);

router.get('/events/:eventId/status',
  requireRole('student'),
  checkRegistrationStatus
);

router.post('/events/:eventId',
  requireRole('student'),
  rules.registerForEvent,
  validate,
  registerForEvent
);

router.delete('/events/:eventId',
  requireRole('student'),
  cancelRegistration
);

// ── Faculty / Admin routes ─────────────────────────────────────────
router.get('/events/:eventId/attendees',
  requireRole(['faculty', 'superadmin']),
  getEventRegistrations
);

router.get('/events/:eventId/export',
  requireRole(['faculty', 'superadmin']),
  exportAttendees
);

router.put('/events/:eventId/close',
  requireRole(['faculty', 'superadmin']),
  closeRegistration
);

router.put('/events/:eventId/seats',
  requireRole(['faculty', 'superadmin']),
  rules.updateSeatLimit,
  validate,
  updateSeatLimit
);

router.put('/events/:eventId/checkin/:registrationId',
  requireRole(['faculty', 'superadmin']),
  checkInAttendee
);

module.exports = router;
