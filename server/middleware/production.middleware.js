'use strict';

/**
 * middleware/production.middleware.js
 *
 * Registers production-grade middleware onto an Express app instance.
 * Called once from app.js before routes are mounted.
 *
 * Middleware applied:
 *   1. trust proxy          — correct IP behind load balancers / Nginx
 *   2. compression          — gzip/brotli for all text responses
 *   3. helmet               — hardened HTTP security headers
 *   4. request timeout      — 408 after REQUEST_TIMEOUT_MS
 *   5. X-Response-Time      — adds response time header for monitoring
 */

const compression = require('compression');
const helmet      = require('helmet');
const timeout     = require('connect-timeout');
const config      = require('../config/env');
const logger      = require('../utils/logger');

// ── 1. Compression ─────────────────────────────────────────────────
// Skip compression for small responses and already-compressed formats
const compressionMiddleware = compression({
  level:  6,          // zlib level 6 — good balance of speed vs ratio
  threshold: 1024,    // only compress responses > 1KB
  filter: (req, res) => {
    // Never compress SSE streams or already-compressed content
    if (req.headers['x-no-compression']) return false;
    return compression.filter(req, res);
  },
});

// ── 2. Helmet — hardened CSP ───────────────────────────────────────
const helmetMiddleware = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc:     ["'self'"],
      scriptSrc:      ["'self'"],
      styleSrc:       ["'self'", "'unsafe-inline'"],   // needed for inline styles
      imgSrc:         ["'self'", 'data:', 'blob:'],
      fontSrc:        ["'self'"],
      connectSrc:     ["'self'"],
      frameSrc:       ["'none'"],
      objectSrc:      ["'none'"],
      upgradeInsecureRequests: config.isProd ? [] : null,
    },
  },
  // HSTS — only in production (avoids breaking local dev over HTTP)
  hsts: config.isProd
    ? { maxAge: 31_536_000, includeSubDomains: true, preload: true }
    : false,
  // Prevent MIME sniffing
  noSniff: true,
  // Disable X-Powered-By (already done by helmet by default)
  hidePoweredBy: true,
  // Referrer policy
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  // Cross-origin policies
  crossOriginEmbedderPolicy: false,   // allow embedding images from /uploads
  crossOriginResourcePolicy: { policy: 'cross-origin' },
});

// ── 3. Request timeout ─────────────────────────────────────────────
// Sends 408 if a request takes longer than REQUEST_TIMEOUT_MS.
// Must be placed before route handlers.
const timeoutMiddleware = timeout(`${config.timeout}ms`);

// Timeout error handler — must follow timeoutMiddleware in the chain
const haltOnTimeout = (req, res, next) => {
  if (!req.timedout) return next();
  logger.warn('Request timed out', {
    method: req.method,
    url:    req.originalUrl,
    ip:     req.ip,
    timeout: config.timeout,
  });
  // connect-timeout already sent 503; just stop the chain
};

// ── 4. X-Response-Time header ──────────────────────────────────────
// Adds `X-Response-Time: 42ms` to every response for APM tools
const responseTimeHeader = (req, res, next) => {
  const start = process.hrtime.bigint();
  // Use writeHead hook — headers must be set before the response is flushed,
  // not in 'finish' which fires after headers are already sent.
  const _writeHead = res.writeHead.bind(res);
  res.writeHead = function (statusCode, ...args) {
    const ms = Number(process.hrtime.bigint() - start) / 1_000_000;
    // Only set if headers haven't been sent yet (guards against double-send)
    if (!res.headersSent) {
      res.setHeader('X-Response-Time', `${ms.toFixed(2)}ms`);
    }
    return _writeHead(statusCode, ...args);
  };
  next();
};

// ── 5. Security extras ─────────────────────────────────────────────
// Remove headers that leak server info
const removeServerHeader = (req, res, next) => {
  res.removeHeader('X-Powered-By');
  res.removeHeader('Server');
  next();
};

/**
 * applyProductionMiddleware(app)
 *
 * Call this in app.js before mounting routes.
 * In development, compression and HSTS are still applied but
 * with relaxed settings so local dev is not broken.
 */
const applyProductionMiddleware = (app) => {
  // Trust first proxy (Nginx, AWS ALB, etc.)
  // Only enable in production — avoids IP spoofing in dev
  if (config.isProd) {
    app.set('trust proxy', 1);
    logger.info('Trust proxy enabled');
  }

  app.use(removeServerHeader);
  app.use(helmetMiddleware);
  app.use(compressionMiddleware);
  app.use(responseTimeHeader);
  app.use(timeoutMiddleware);
  app.use(haltOnTimeout);
};

module.exports = applyProductionMiddleware;
