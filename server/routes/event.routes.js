const router = require('express').Router();
const {
  createEvent,
  getEvents,
  getEventById,
  updateEvent,
  uploadBannerToEvent,
  uploadDocumentsToEvent,
  deleteEventFile,
  replaceWorkshopMaterial,
  getEventFiles,
  deleteEvent,
  searchEvents,
  getEventAnalytics,
  getFacultyAnalytics,
} = require('../controllers/event.controller');
const {
  verifyToken,
  requireRole,
  requireVerifiedCollege,
} = require('../middleware/auth.middleware');
const {
  uploadEventBanner,
  uploadEventDocuments,
  uploadWorkshopMaterials,
} = require('../middleware/upload.middleware');
const { rules, validate } = require('../middleware/validate.middleware');
const { cacheFor } = require('../middleware/cache.middleware');
const { uploadLimiter } = require('../middleware/rateLimiter.middleware');

// ── Faculty + verified-college guard reused across upload routes ───
const facultyGuard = [verifyToken, requireRole(['faculty', 'superadmin']), requireVerifiedCollege];

// ── Read routes (students + faculty + admin) ───────────────────────
// IMPORTANT: /search and /analytics/summary must be before /:id
router.get('/search',            verifyToken, cacheFor(120), rules.searchEvents, validate, searchEvents);
router.get('/analytics/summary', verifyToken, requireRole(['faculty', 'superadmin']), cacheFor(180), getFacultyAnalytics);
router.get('/',                  verifyToken, cacheFor(180), rules.paginationQuery, validate, getEvents);
router.get('/:id',               verifyToken, getEventById);
router.get('/:id/analytics',     verifyToken, requireRole(['faculty', 'superadmin']), cacheFor(120), getEventAnalytics);

// ── Create event (with optional inline document upload) ────────────
router.post(
  '/',
  ...facultyGuard,
  uploadLimiter,
  uploadEventDocuments,
  rules.createEvent,
  validate,
  createEvent
);

// ── Update event text fields + optional file replacements ──────────
router.put(
  '/:id',
  ...facultyGuard,
  uploadLimiter,
  uploadEventDocuments,
  updateEvent
);

// ── Dedicated banner upload ────────────────────────────────────────
router.post(
  '/:id/upload-banner',
  ...facultyGuard,
  uploadLimiter,
  uploadEventBanner,
  uploadBannerToEvent
);

// ── Upload / replace any event documents ──────────────────────────
router.post(
  '/:id/upload-documents',
  ...facultyGuard,
  uploadLimiter,
  uploadEventDocuments,
  uploadDocumentsToEvent
);

// ── File management (list, delete, replace workshop) ─────────────
router.get('/:id/files',                    ...facultyGuard, getEventFiles);
router.delete('/:id/files',                 ...facultyGuard, deleteEventFile);
router.patch('/:id/files/replace-workshop', ...facultyGuard, uploadLimiter, uploadWorkshopMaterials, replaceWorkshopMaterial);

// ── Legacy delete-file alias ───────────────────────────────────────
router.delete('/:id/delete-file', ...facultyGuard, deleteEventFile);

// ── Delete entire event + all its files ───────────────────────────
router.delete('/:id', ...facultyGuard, deleteEvent);

module.exports = router;
