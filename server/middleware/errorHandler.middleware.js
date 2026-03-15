'use strict';

const ApiError = require('../utils/ApiError');
const logger   = require('../utils/logger');

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  const ctx = {
    method:  req.method,
    route:   req.originalUrl,
    userId:  req.user?.id   ?? null,
    ip:      req.ip,
  };

  // ── Mongoose duplicate key ─────────────────────────────────────
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    logger.warn('Duplicate key error', { ...ctx, field, keyValue: err.keyValue });
    return res.status(409).json({
      success: false,
      message: `${field} already exists`,
      errors:  [],
    });
  }

  // ── Mongoose validation error ──────────────────────────────────
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map((e) => ({
      field:   e.path,
      message: e.message,
    }));
    logger.warn('Mongoose validation error', { ...ctx, errors });
    return res.status(400).json({ success: false, message: 'Validation error', errors });
  }

  // ── Mongoose cast error (invalid ObjectId) ─────────────────────
  if (err.name === 'CastError') {
    logger.warn('Cast error — invalid ID', { ...ctx, path: err.path, value: err.value });
    return res.status(400).json({ success: false, message: 'Invalid ID format', errors: [] });
  }

  // ── Operational errors (ApiError instances) ────────────────────
  if (err.isOperational) {
    // 4xx are warnings, 5xx are errors
    const logLevel = err.statusCode >= 500 ? 'error' : 'warn';
    logger[logLevel](`Operational error: ${err.message}`, {
      ...ctx,
      statusCode: err.statusCode,
      errors:     err.errors,
    });
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      errors:  err.errors || [],
    });
  }

  // ── Unknown / programmer errors ────────────────────────────────
  // Log full stack — never expose internals to client in production
  logger.appError(err, ctx);

  return res.status(500).json({
    success: false,
    message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
    errors:  [],
  });
};

module.exports = errorHandler;
