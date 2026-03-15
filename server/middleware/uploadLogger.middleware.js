'use strict';

const logger = require('../utils/logger');

/**
 * uploadLogger — Express middleware
 *
 * Must be placed AFTER a multer middleware in the chain.
 * Logs metadata for every uploaded file (single or multi-field).
 * Never logs file contents — only metadata.
 */
const uploadLogger = (req, res, next) => {
  const userId = req.user?.id ?? 'anonymous';

  // Multi-field upload (req.files is an object of arrays)
  if (req.files && typeof req.files === 'object') {
    const allFiles = Object.values(req.files).flat();
    allFiles.forEach((file) => {
      logger.upload({
        userId,
        field:       file.fieldname,
        originalName: file.originalname,
        storedName:  file.filename,
        destination: file.destination,
        size:        file.size,
        mimetype:    file.mimetype,
        route:       req.originalUrl,
      });
    });
  }

  // Single file upload (req.file)
  if (req.file) {
    logger.upload({
      userId,
      field:       req.file.fieldname,
      originalName: req.file.originalname,
      storedName:  req.file.filename,
      destination: req.file.destination,
      size:        req.file.size,
      mimetype:    req.file.mimetype,
      route:       req.originalUrl,
    });
  }

  next();
};

module.exports = uploadLogger;
