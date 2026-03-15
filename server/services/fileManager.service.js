'use strict';

const path   = require('path');
const fs     = require('fs');
const logger = require('../utils/logger');
const ApiError = require('../utils/ApiError');

// ── Constants ──────────────────────────────────────────────────────

// Maps each event field name → its upload subfolder
const FIELD_FOLDER = {
  bannerImage:       'event-banners',
  posterImage:       'event-banners',
  brochurePdf:       'event-documents',
  rulebookPdf:       'event-documents',
  workshopMaterials: 'event-documents',
};

const SINGLE_FILE_FIELDS    = ['bannerImage', 'posterImage', 'brochurePdf', 'rulebookPdf'];
const ARRAY_FILE_FIELDS     = ['workshopMaterials'];
const ALL_MANAGED_FIELDS    = [...SINGLE_FILE_FIELDS, ...ARRAY_FILE_FIELDS];

// ── Core file operations ───────────────────────────────────────────

/**
 * Resolve a stored relative path to an absolute filesystem path.
 * Stored paths look like: "uploads/event-banners/uuid.jpg"
 */
const toAbsolute = (relativePath, uploadRoot) =>
  path.resolve(uploadRoot, '..', relativePath);

/**
 * Safely delete a file from disk.
 * - Logs success and failure.
 * - Never throws — a missing file is not an error (idempotent).
 * @returns {boolean} true if file was deleted, false if it didn't exist
 */
const safeDelete = (relativePath, uploadRoot, context = {}) => {
  if (!relativePath) return false;
  const abs = toAbsolute(relativePath, uploadRoot);
  try {
    if (!fs.existsSync(abs)) {
      logger.warn('File not found on disk during delete', {
        relativePath,
        ...context,
      });
      return false;
    }
    fs.unlinkSync(abs);
    logger.info('File deleted from disk', { relativePath, ...context });
    return true;
  } catch (err) {
    logger.error('Failed to delete file from disk', {
      relativePath,
      error: err.message,
      ...context,
    });
    return false;
  }
};

/**
 * Atomically replace a file field on an event document.
 *
 * Strategy:
 *   1. Save the new multer file path into the event field.
 *   2. Attempt event.save() — if it fails, delete the newly uploaded
 *      file (orphan prevention) and re-throw.
 *   3. Only after a successful save, delete the old file from disk.
 *
 * This ensures:
 *   - If DB save fails  → new file is cleaned up, old file preserved.
 *   - If disk delete fails → DB is already consistent, just log the error.
 *
 * @param {Object}  opts
 * @param {Object}  opts.event       - Mongoose event document
 * @param {string}  opts.field       - Field name (e.g. 'bannerImage')
 * @param {Object}  opts.multerFile  - Multer file object from req.file / req.files
 * @param {string}  opts.uploadRoot  - Absolute path to uploads root
 * @param {string}  opts.toRelative  - Function(file, folder) → relative path string
 * @param {Object}  opts.context     - Extra fields for log entries (userId, eventId)
 */
const atomicReplace = async ({ event, field, multerFile, uploadRoot, toRelative, context = {} }) => {
  if (!SINGLE_FILE_FIELDS.includes(field))
    throw new Error(`atomicReplace: "${field}" is not a single-file field`);

  const folder      = FIELD_FOLDER[field];
  const oldPath     = event[field] ?? null;
  const newRelative = toRelative(multerFile, folder);

  // Stage 1 — update the document field in memory
  event[field] = newRelative;

  try {
    // Stage 2 — persist to DB
    await event.save();
  } catch (saveErr) {
    // DB failed — clean up the newly uploaded file to prevent orphan
    safeDelete(newRelative, uploadRoot, { ...context, reason: 'db_save_failed' });
    throw saveErr;
  }

  // Stage 3 — DB succeeded, now safe to remove the old file
  if (oldPath) {
    safeDelete(oldPath, uploadRoot, { ...context, reason: 'replaced' });
  }

  logger.info('File replaced', { field, oldPath, newPath: newRelative, ...context });
  return newRelative;
};

/**
 * Delete a single-file field from an event document.
 * Removes from DB first, then disk — so a disk failure doesn't leave
 * a dangling DB reference.
 */
const deleteField = async ({ event, field, uploadRoot, context = {} }) => {
  if (!SINGLE_FILE_FIELDS.includes(field))
    throw ApiError.badRequest(`"${field}" is not a deletable single-file field`);

  const relativePath = event[field];
  if (!relativePath) throw ApiError.badRequest(`No file exists for field "${field}"`);

  // Remove from DB first
  event[field] = null;
  await event.save();

  // Then remove from disk
  safeDelete(relativePath, uploadRoot, { ...context, reason: 'user_deleted' });

  logger.info('File field deleted', { field, relativePath, ...context });
};

/**
 * Delete a single workshop material by index.
 * Removes from DB array first, then disk.
 */
const deleteWorkshopMaterial = async ({ event, index, uploadRoot, context = {} }) => {
  const idx = Number(index);
  if (isNaN(idx) || idx < 0 || idx >= event.workshopMaterials.length)
    throw ApiError.badRequest('Invalid workshop material index');

  const relativePath = event.workshopMaterials[idx];

  // Remove from DB array first
  event.workshopMaterials.splice(idx, 1);
  await event.save();

  // Then remove from disk
  safeDelete(relativePath, uploadRoot, { ...context, reason: 'user_deleted' });

  logger.info('Workshop material deleted', { index: idx, relativePath, ...context });
};

/**
 * Replace a workshop material at a specific index.
 * Atomic: DB updated before old file removed.
 */
const replaceWorkshopMaterial = async ({ event, index, multerFile, uploadRoot, toRelative, context = {} }) => {
  const idx = Number(index);
  if (isNaN(idx) || idx < 0 || idx >= event.workshopMaterials.length)
    throw ApiError.badRequest('Invalid workshop material index');

  const oldPath     = event.workshopMaterials[idx];
  const newRelative = toRelative(multerFile, 'event-documents');

  event.workshopMaterials[idx] = newRelative;
  event.markModified('workshopMaterials');

  try {
    await event.save();
  } catch (saveErr) {
    safeDelete(newRelative, uploadRoot, { ...context, reason: 'db_save_failed' });
    throw saveErr;
  }

  safeDelete(oldPath, uploadRoot, { ...context, reason: 'replaced' });
  logger.info('Workshop material replaced', { index: idx, oldPath, newPath: newRelative, ...context });
  return newRelative;
};

/**
 * Delete ALL files associated with an event from disk.
 * Called when an event document is being deleted.
 * Never throws — logs each failure individually.
 */
const deleteAllEventFiles = (event, uploadRoot, context = {}) => {
  SINGLE_FILE_FIELDS.forEach((field) => {
    if (event[field]) safeDelete(event[field], uploadRoot, context);
  });
  (event.workshopMaterials ?? []).forEach((p) => safeDelete(p, uploadRoot, context));
};

// ── Ownership validation ───────────────────────────────────────────

/**
 * Validate that the requesting user owns the event.
 * Superadmins bypass this check.
 * Faculty must match both createdBy AND college.
 *
 * @param {Object} event    - Mongoose event document (needs createdBy, college)
 * @param {Object} user     - req.user (needs id, role)
 * @param {string} collegeId - req.collegeId (set by requireVerifiedCollege)
 */
const assertOwnership = (event, user, collegeId) => {
  if (user.role === 'superadmin') return;

  const isCreator       = event.createdBy.toString() === user.id;
  const isSameCollege   = collegeId
    ? event.college.toString() === collegeId.toString()
    : true;

  if (!isCreator)
    throw ApiError.forbidden('You do not own this event');

  if (!isSameCollege)
    throw ApiError.forbidden('Event does not belong to your college');
};

/**
 * Build a summary of all file fields on an event for the files API.
 */
const getFileManifest = (event, toUrl) => ({
  bannerImage:       { url: toUrl(event.bannerImage),  path: event.bannerImage  ?? null, exists: !!event.bannerImage },
  posterImage:       { url: toUrl(event.posterImage),  path: event.posterImage  ?? null, exists: !!event.posterImage },
  brochurePdf:       { url: toUrl(event.brochurePdf),  path: event.brochurePdf  ?? null, exists: !!event.brochurePdf },
  rulebookPdf:       { url: toUrl(event.rulebookPdf),  path: event.rulebookPdf  ?? null, exists: !!event.rulebookPdf },
  workshopMaterials: (event.workshopMaterials ?? []).map((p, i) => ({
    index: i,
    url:   toUrl(p),
    path:  p,
  })),
});

module.exports = {
  // constants
  FIELD_FOLDER,
  SINGLE_FILE_FIELDS,
  ARRAY_FILE_FIELDS,
  ALL_MANAGED_FIELDS,
  // core ops
  safeDelete,
  atomicReplace,
  deleteField,
  deleteWorkshopMaterial,
  replaceWorkshopMaterial,
  deleteAllEventFiles,
  // validation
  assertOwnership,
  // manifest
  getFileManifest,
};
