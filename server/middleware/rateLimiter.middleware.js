'use strict';

const rateLimit = require('express-rate-limit');
const config    = require('../config/env');
const logger    = require('../utils/logger');

// ── Shared skip function ───────────────────────────────────────────
// Never rate-limit health checks
const skipHealthCheck = (req) => req.path === '/health';

// ── Shared handler for when limit is exceeded ─────────────────────
const onLimitReached = (req, res, options) => {
  logger.warn('Rate limit exceeded', {
    ip:     req.ip,
    route:  req.originalUrl,
    method: req.method,
    limit:  options.max,
  });
};

// ── Auth limiter — tight window for login/register ─────────────────
// 10 attempts per 15 minutes per IP; skipped in development
const authLimiter = rateLimit({
  windowMs:        config.rateLimit.windowMs,
  max:             config.rateLimit.maxAuth,
  message:         { success: false, message: 'Too many attempts. Try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders:   false,
  skip:            (req) => req.path === '/health' || config.env === 'development',
  handler: (req, res, next, options) => {
    onLimitReached(req, res, options);
    res.status(options.statusCode).json(options.message);
  },
});

// ── API limiter — general API routes ──────────────────────────────
// 100 requests per 15 minutes per IP
const apiLimiter = rateLimit({
  windowMs:        config.rateLimit.windowMs,
  max:             config.rateLimit.maxApi,
  message:         { success: false, message: 'Too many requests. Please slow down.' },
  standardHeaders: true,
  legacyHeaders:   false,
  skip:            skipHealthCheck,
  handler: (req, res, next, options) => {
    onLimitReached(req, res, options);
    res.status(options.statusCode).json(options.message);
  },
});

// ── Upload limiter — file upload routes ───────────────────────────
// 20 uploads per hour per IP
const uploadLimiter = rateLimit({
  windowMs:        60 * 60 * 1000,   // 1 hour — fixed, uploads are expensive
  max:             config.rateLimit.maxUpload,
  message:         { success: false, message: 'Upload limit reached. Try again later.' },
  standardHeaders: true,
  legacyHeaders:   false,
  handler: (req, res, next, options) => {
    onLimitReached(req, res, options);
    res.status(options.statusCode).json(options.message);
  },
});

// ── Refresh token limiter — prevent token-farming ─────────────────
// 60 refreshes per 15 minutes per IP; skipped entirely in development
const refreshLimiter = rateLimit({
  windowMs:        config.rateLimit.windowMs,
  max:             60,
  message:         { success: false, message: 'Too many token refresh attempts.' },
  standardHeaders: true,
  legacyHeaders:   false,
  skip:            () => config.env === 'development',
  handler: (req, res, next, options) => {
    onLimitReached(req, res, options);
    res.status(options.statusCode).json(options.message);
  },
});

module.exports = { authLimiter, apiLimiter, uploadLimiter, refreshLimiter };
