'use strict';

/**
 * middleware/sanitize.middleware.js
 *
 * Two-layer sanitization applied globally before any route handler:
 *
 *   1. mongoSanitize — strips keys that start with `$` or contain `.`
 *      from req.body / req.query / req.params, preventing NoSQL injection.
 *
 *   2. xssSanitize  — recursively escapes HTML entities in every string
 *      value inside req.body / req.query, preventing stored/reflected XSS.
 *
 * Both middlewares are intentionally non-throwing: malicious keys are
 * silently removed / escaped so the request continues with clean data.
 * Validation rules downstream will reject anything that becomes empty
 * after sanitization.
 */

const mongoSanitize = require('express-mongo-sanitize');
const xss           = require('xss');

// ── 1. NoSQL injection — remove operator keys ──────────────────────
// replaceWith: '_' turns `{ "$gt": "" }` into `{ "_gt": "" }` so the
// key survives but is harmless; the empty value is caught by validators.
const noSqlSanitize = mongoSanitize({
  replaceWith:    '_',
  allowDots:      false,
  onSanitize:     ({ req, key }) => {
    const logger = require('../utils/logger');
    logger.warn('NoSQL injection attempt blocked', {
      key,
      ip:    req.ip,
      route: req.originalUrl,
    });
  },
});

// ── 2. XSS — escape HTML in all string values ─────────────────────
const XSS_OPTIONS = {
  whiteList:        {},   // no tags allowed — strip everything
  stripIgnoreTag:   true,
  stripIgnoreTagBody: ['script', 'style'],
};

const sanitizeValue = (val) => {
  if (typeof val === 'string') return xss(val, XSS_OPTIONS);
  if (Array.isArray(val))      return val.map(sanitizeValue);
  if (val !== null && typeof val === 'object') return sanitizeObject(val);
  return val;
};

const sanitizeObject = (obj) => {
  const clean = {};
  for (const key of Object.keys(obj)) {
    clean[key] = sanitizeValue(obj[key]);
  }
  return clean;
};

const xssSanitize = (req, _res, next) => {
  if (req.body  && typeof req.body  === 'object') req.body  = sanitizeObject(req.body);
  if (req.query && typeof req.query === 'object') req.query = sanitizeObject(req.query);
  next();
};

module.exports = { noSqlSanitize, xssSanitize };
