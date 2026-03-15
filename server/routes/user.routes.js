const router = require('express').Router();
const {
  getProfile, updateProfile, uploadResume, toggleBookmark, getBookmarks,
} = require('../controllers/user.controller');
const { verifyToken, requireRole } = require('../middleware/auth.middleware');
const { uploadResume: resumeUpload } = require('../middleware/upload.middleware');
const { uploadLimiter } = require('../middleware/rateLimiter.middleware');

router.use(verifyToken);

router.get('/me',                    getProfile);
router.put('/me',                    updateProfile);
router.post('/me/resume', uploadLimiter, resumeUpload, uploadResume);
router.get('/me/bookmarks',          requireRole('student'), getBookmarks);
router.post('/me/bookmarks/:eventId', requireRole('student'), toggleBookmark);

module.exports = router;
