const multer = require('multer');
const path   = require('path');
const fs     = require('fs');
const { v4: uuidv4 } = require('uuid');
const ApiError = require('../utils/ApiError');
const config   = require('../config/env');

// ── Upload root — driven by UPLOAD_PATH config ────────────────────
const UPLOAD_ROOT = path.resolve(__dirname, '..', config.upload.path);

// ── Extension ↔ MIME consistency check ────────────────────────────
// Prevents disguised uploads like a .jpg file that is actually a PDF
const EXT_MIME_MAP = {
  '.jpg':  ['image/jpeg'],
  '.jpeg': ['image/jpeg'],
  '.png':  ['image/png'],
  '.pdf':  ['application/pdf'],
};

const checkExtMime = (file) => {
  const ext      = path.extname(file.originalname).toLowerCase();
  const allowed  = EXT_MIME_MAP[ext];
  // Unknown extension — let magic-byte check handle it
  if (!allowed) return true;
  return allowed.includes(file.mimetype);
};

// ── Magic bytes for server-side MIME verification ──────────────────
// Prevents spoofed Content-Type headers
const MAGIC_BYTES = {
  'image/jpeg': [0xff, 0xd8, 0xff],
  'image/png':  [0x89, 0x50, 0x4e, 0x47],
  'application/pdf': [0x25, 0x50, 0x44, 0x46], // %PDF
};

const verifyMagicBytes = (filePath, mimeType) => {
  const expected = MAGIC_BYTES[mimeType];
  if (!expected) return false;
  const buf = Buffer.alloc(expected.length);
  const fd = fs.openSync(filePath, 'r');
  fs.readSync(fd, buf, 0, expected.length, 0);
  fs.closeSync(fd);
  return expected.every((byte, i) => buf[i] === byte);
};

// ── Sanitize original filename for logging/display only ───────────
// Actual stored filename is always a UUID — this is just for metadata
const sanitizeOriginalName = (name) =>
  path.basename(name).replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 100);

// ── Storage factory ────────────────────────────────────────────────
const storageFor = (folder) =>
  multer.diskStorage({
    destination: (req, file, cb) => {
      const dest = path.join(UPLOAD_ROOT, folder);
      fs.mkdirSync(dest, { recursive: true }); // ensure folder exists
      cb(null, dest);
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `${uuidv4()}${ext}`);
    },
  });

// ── MIME filter factories ──────────────────────────────────────────
const ALLOWED_IMAGE_MIMES = ['image/jpeg', 'image/png'];
const ALLOWED_PDF_MIMES   = ['application/pdf'];
const ALLOWED_DOC_MIMES   = [...ALLOWED_IMAGE_MIMES, ...ALLOWED_PDF_MIMES];

const mimeFilter = (allowed) => (req, file, cb) => {
  if (!allowed.includes(file.mimetype))
    return cb(
      ApiError.badRequest(
        `Invalid file type "${file.mimetype}". Allowed: ${allowed.join(', ')}`
      ),
      false
    );
  cb(null, true);
};

// ── Size limits — driven by config ───────────────────────────────
const EVENT_FILE_SIZE = config.upload.maxFileSizeBytes;          // default 10 MB
const LOGO_FILE_SIZE  = Math.min(2 * 1024 * 1024, EVENT_FILE_SIZE);
const RESUME_SIZE     = Math.min(5 * 1024 * 1024, EVENT_FILE_SIZE);

// ── Multer instances ───────────────────────────────────────────────

// Event banner / poster — single image
const _eventImage = multer({
  storage: storageFor('event-banners'),
  fileFilter: mimeFilter(ALLOWED_IMAGE_MIMES),
  limits: { fileSize: EVENT_FILE_SIZE },
});

// Event documents — banner + poster + brochure + rulebook in one request
const _eventDocuments = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      // Route images to event-banners, PDFs to event-documents
      const isImage = ALLOWED_IMAGE_MIMES.includes(file.mimetype);
      const folder  = isImage ? 'event-banners' : 'event-documents';
      const dest    = path.join(UPLOAD_ROOT, folder);
      fs.mkdirSync(dest, { recursive: true });
      cb(null, dest);
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `${uuidv4()}${ext}`);
    },
  }),
  fileFilter: mimeFilter(ALLOWED_DOC_MIMES),
  limits: { fileSize: EVENT_FILE_SIZE },
});

// Workshop materials — up to 5 PDFs
const _workshopMaterials = multer({
  storage: storageFor('event-documents'),
  fileFilter: mimeFilter(ALLOWED_PDF_MIMES),
  limits: { fileSize: EVENT_FILE_SIZE, files: 5 },
});

// College logo
const _collegeLogo = multer({
  storage: storageFor('college-logos'),
  fileFilter: mimeFilter(ALLOWED_IMAGE_MIMES),
  limits: { fileSize: LOGO_FILE_SIZE },
});

// Student resume
const _resume = multer({
  storage: storageFor('resumes'),
  fileFilter: mimeFilter(ALLOWED_PDF_MIMES),
  limits: { fileSize: RESUME_SIZE },
});

// ── Magic-byte post-validation ─────────────────────────────────────
// Runs after multer saves the file — deletes and rejects if bytes mismatch
const withMagicCheck = (next, req) => {
  const files = req.files
    ? Object.values(req.files).flat()
    : req.file
    ? [req.file]
    : [];

  for (const file of files) {
    if (!checkExtMime(file)) {
      fs.unlinkSync(file.path);
      return next(ApiError.badRequest(`File "${sanitizeOriginalName(file.originalname)}" extension does not match its content type`));
    }
    if (!verifyMagicBytes(file.path, file.mimetype)) {
      fs.unlinkSync(file.path); // delete the suspicious file
      return next(ApiError.badRequest(`File "${sanitizeOriginalName(file.originalname)}" failed content verification`));
    }
  }
  next();
};

// ── Multer error wrapper ───────────────────────────────────────────
const logger = require('../utils/logger');

const wrap = (uploader) => (req, res, next) => {
  uploader(req, res, (err) => {
    if (!err) {
      // Log every successfully uploaded file
      const files = req.files
        ? Object.values(req.files).flat()
        : req.file ? [req.file] : [];
      files.forEach((f) =>
        logger.upload({
          userId:      req.user?.id ?? 'anonymous',
          field:       f.fieldname,
          originalName: f.originalname,
          storedName:  f.filename,
          destination: f.destination,
          size:        f.size,
          mimetype:    f.mimetype,
          route:       req.originalUrl,
        })
      );
      return withMagicCheck(next, req);
    }
    if (err instanceof multer.MulterError) {
      logger.warn('Multer upload error', {
        code:   err.code,
        field:  err.field,
        route:  req.originalUrl,
        userId: req.user?.id,
      });
      if (err.code === 'LIMIT_FILE_SIZE')
        return next(ApiError.badRequest('File exceeds 10MB size limit'));
      if (err.code === 'LIMIT_FILE_COUNT')
        return next(ApiError.badRequest('Too many files. Maximum 5 allowed'));
      return next(ApiError.badRequest(err.message));
    }
    next(err);
  });
};

// ── Exported middleware ────────────────────────────────────────────

// POST /api/events/:id/upload-banner  → field: "bannerImage"
const uploadEventBanner = wrap(_eventImage.single('bannerImage'));

// POST /api/events/:id/upload-banner  → field: "posterImage"
const uploadEventPoster = wrap(_eventImage.single('posterImage'));

// POST /api/events/:id/upload-documents
// Accepts: bannerImage, posterImage, brochurePdf, rulebookPdf
const uploadEventDocuments = wrap(
  _eventDocuments.fields([
    { name: 'bannerImage',  maxCount: 1 },
    { name: 'posterImage',  maxCount: 1 },
    { name: 'brochurePdf',  maxCount: 1 },
    { name: 'rulebookPdf',  maxCount: 1 },
  ])
);

// POST /api/events/:id/upload-workshop  → field: "workshopMaterials"
const uploadWorkshopMaterials = wrap(_workshopMaterials.array('workshopMaterials', 5));

// College logo
const uploadCollegeLogo = wrap(_collegeLogo.single('logo'));

// Student resume
const uploadResume = wrap(_resume.single('resume'));

// Legacy alias kept for backward compat with college.routes.js
const uploadLogo   = uploadCollegeLogo;
const uploadBanner = uploadEventBanner;

module.exports = {
  uploadEventBanner,
  uploadEventPoster,
  uploadEventDocuments,
  uploadWorkshopMaterials,
  uploadCollegeLogo,
  uploadResume,
  // legacy aliases
  uploadLogo,
  uploadBanner,
  // expose root for controllers that build file paths
  UPLOAD_ROOT,
};
