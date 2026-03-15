const router = require('express').Router();
const {
  getMyCollege, createCollege, getColleges, getCollegeById, updateCollege, submitCollegeEdit,
} = require('../controllers/college.controller');
const { verifyToken, requireRole } = require('../middleware/auth.middleware');
const { uploadLogo } = require('../middleware/upload.middleware');
const { rules, validate } = require('../middleware/validate.middleware');
const { cacheFor } = require('../middleware/cache.middleware');

router.get('/my',         verifyToken, requireRole('faculty'), getMyCollege);
router.patch('/my/edit',  verifyToken, requireRole('faculty'), uploadLogo, submitCollegeEdit);
router.get('/',     verifyToken, cacheFor(300), getColleges);
router.get('/:id',  verifyToken, getCollegeById);

router.post(
  '/',
  verifyToken,
  requireRole('faculty'),
  uploadLogo,
  rules.createCollege,
  validate,
  createCollege
);

router.put(
  '/:id',
  verifyToken,
  requireRole(['faculty', 'superadmin']),
  uploadLogo,
  updateCollege
);

module.exports = router;
