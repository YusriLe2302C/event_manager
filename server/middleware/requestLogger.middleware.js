'use strict';

const logger = require('../utils/logger');
const config = require('../config/env');

// Routes that carry sensitive data — redact the body from logs
const SENSITIVE_ROUTES = new Set([
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/refresh',
]);

// Headers that should never appear in logs
const REDACTED_HEADERS = new Set([
  'authorization',
  'cookie',
  'set-cookie',
  'x-api-key',
]);

const sanitizeHeaders = (headers) => {
  const out = {};
  for (const [k, v] of Object.entries(headers)) {
    out[k] = REDACTED_HEADERS.has(k.toLowerCase()) ? '[REDACTED]' : v;
  }
  return out;
};

// Skip logging for health checks and static file requests
const SKIP_PATHS = ['/health', '/uploads'];
const shouldSkip = (url) => SKIP_PATHS.some((p) => url.startsWith(p));

/**
 * requestLogger — Express middleware
 *
 * Attaches a `startAt` timestamp on the request, then hooks into
 * `res.on('finish')` to log after the response is sent.
 * This gives accurate response times without blocking the response.
 */
const requestLogger = (req, res, next) => {
  if (shouldSkip(req.originalUrl)) return next();

  req._startAt = process.hrtime.bigint();

  res.on('finish', () => {
    const durationNs = process.hrtime.bigint() - req._startAt;
    const responseTimeMs = Number(durationNs / 1_000_000n);

    const logData = {
      method:       req.method,
      url:          req.originalUrl,
      route:        req.route?.path ?? req.path,
      status:       res.statusCode,
      responseTime: `${responseTimeMs}ms`,
      ip:           req.ip || req.connection?.remoteAddress,
      userId:       req.user?.id   ?? null,
      userRole:     req.user?.role ?? null,
      userAgent:    req.headers['user-agent'] ?? null,
      contentLength: res.getHeader('content-length') ?? null,
    };

    // Include sanitised request headers only when LOG_HEADERS=true
    if (config.log.logHeaders) {
      logData.headers = sanitizeHeaders(req.headers);
    }

    // Log level based on status code
    if (res.statusCode >= 500) {
      logger.error('HTTP Request', logData);
    } else if (res.statusCode >= 400) {
      logger.warn('HTTP Request', logData);
    } else {
      logger.log('http', 'HTTP Request', logData);
    }
  });

  next();
};

module.exports = requestLogger;
