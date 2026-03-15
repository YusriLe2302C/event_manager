'use strict';

const { createLogger, format, transports } = require('winston');
require('winston-daily-rotate-file');
const path = require('path');
const fs   = require('fs');

// ── Ensure logs/ directory exists ─────────────────────────────────
const LOG_DIR = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });

const IS_PROD = process.env.NODE_ENV === 'production';

// Read log level from config if available, fall back to env-based default
const getLogLevel = () => {
  try {
    return require('../config/env').log.level;
  } catch {
    // config not yet loaded (e.g. during validation itself)
    return IS_PROD ? 'info' : 'debug';
  }
};

// ── Custom log levels ──────────────────────────────────────────────
// Extends Winston defaults with an 'audit' level for admin actions
const LEVELS = {
  error:   0,
  warn:    1,
  audit:   2,   // admin actions, auth events
  info:    3,
  http:    4,   // request logs
  debug:   5,
};

const LEVEL_COLORS = {
  error: 'red',
  warn:  'yellow',
  audit: 'magenta',
  info:  'green',
  http:  'cyan',
  debug: 'white',
};

require('winston').addColors(LEVEL_COLORS);

// ── Formats ────────────────────────────────────────────────────────

// Production: compact JSON — one line per log entry, easy to parse
const jsonFormat = format.combine(
  format.timestamp({ format: 'YYYY-MM-DDTHH:mm:ss.SSSZ' }),
  format.errors({ stack: true }),
  format.json()
);

// Development: coloured, human-readable
const prettyFormat = format.combine(
  format.timestamp({ format: 'HH:mm:ss' }),
  format.errors({ stack: true }),
  format.colorize({ all: true }),
  format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length
      ? '\n  ' + JSON.stringify(meta, null, 2).replace(/\n/g, '\n  ')
      : '';
    return `${timestamp} [${level}] ${message}${metaStr}`;
  })
);

// ── Transports ─────────────────────────────────────────────────────

// error.log — only error level, daily rotation, 30-day retention
const errorFileTransport = new transports.DailyRotateFile({
  filename:     path.join(LOG_DIR, 'error-%DATE%.log'),
  datePattern:  'YYYY-MM-DD',
  level:        'error',
  format:       jsonFormat,
  maxSize:      '20m',
  maxFiles:     '30d',
  zippedArchive: true,
  auditFile:    path.join(LOG_DIR, '.error-audit.json'),
});

// combined.log — all levels, daily rotation, 14-day retention
const combinedFileTransport = new transports.DailyRotateFile({
  filename:     path.join(LOG_DIR, 'combined-%DATE%.log'),
  datePattern:  'YYYY-MM-DD',
  level:        'debug',
  format:       jsonFormat,
  maxSize:      '50m',
  maxFiles:     '14d',
  zippedArchive: true,
  auditFile:    path.join(LOG_DIR, '.combined-audit.json'),
});

// audit.log — only audit level (admin actions), 90-day retention
const auditFileTransport = new transports.DailyRotateFile({
  filename:     path.join(LOG_DIR, 'audit-%DATE%.log'),
  datePattern:  'YYYY-MM-DD',
  level:        'audit',
  format:       jsonFormat,
  maxSize:      '20m',
  maxFiles:     '90d',
  zippedArchive: true,
  auditFile:    path.join(LOG_DIR, '.audit-meta.json'),
});

// Console — pretty in dev, JSON in prod (for log aggregators)
const LOG_LEVEL = getLogLevel();

const consoleTransport = new transports.Console({
  level:  IS_PROD ? 'warn' : 'debug',
  format: IS_PROD ? jsonFormat : prettyFormat,
});

// ── Logger instance ────────────────────────────────────────────────
const logger = createLogger({
  levels:            LEVELS,
  level:             LOG_LEVEL,
  exitOnError:       false,
  transports: [
    consoleTransport,
    errorFileTransport,
    combinedFileTransport,
    auditFileTransport,
  ],
});

// ── Rotation event hooks ───────────────────────────────────────────
[errorFileTransport, combinedFileTransport, auditFileTransport].forEach((t) => {
  t.on('rotate', (oldFile, newFile) => {
    logger.info('Log file rotated', { oldFile, newFile });
  });
});

// ── Convenience helpers ────────────────────────────────────────────

/**
 * Log an HTTP request. Called by requestLogger middleware.
 * @param {Object} data  { method, url, status, responseTime, ip, userId, userAgent }
 */
logger.http = (data) => logger.log('http', 'HTTP Request', data);

/**
 * Log an authentication event (login, logout, token failure, register).
 * @param {string} event  e.g. 'login_success', 'login_failed', 'token_expired'
 * @param {Object} data   { userId?, email?, ip, userAgent?, reason? }
 */
logger.auth = (event, data) =>
  logger.log('audit', `AUTH:${event}`, { event, ...data });

/**
 * Log an admin action. Mirrors the AdminLog MongoDB schema.
 * @param {string} action      e.g. 'college_approved', 'user_suspended'
 * @param {Object} data        { performedBy, targetType, targetId, description, severity, ip }
 */
logger.admin = (action, data) =>
  logger.log('audit', `ADMIN:${action}`, { action, ...data });

/**
 * Log a file upload event.
 * @param {Object} data  { userId, field, filename, size, mimetype, destination }
 */
logger.upload = (data) =>
  logger.log('info', 'FILE_UPLOAD', { event: 'file_upload', ...data });

/**
 * Log an application error with full context.
 * @param {Error}  err
 * @param {Object} ctx  { route?, method?, userId?, ip? }
 */
logger.appError = (err, ctx = {}) =>
  logger.error(err.message, {
    stack:      err.stack,
    statusCode: err.statusCode,
    ...ctx,
  });

module.exports = logger;
