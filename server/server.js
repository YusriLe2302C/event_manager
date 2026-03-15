'use strict';

// ── Step 1: load .env before anything else ─────────────────────────
require('dotenv').config();

// ── Step 2: validate environment — exits with clear errors if invalid
const config = require('./config/env');

// ── Step 3: everything else depends on a valid config ─────────────
const app       = require('./app');
const connectDB = require('./config/db');
const logger    = require('./utils/logger');
const deadlineReminder = require('./jobs/deadlineReminder.job');

const start = async () => {
  // Connect to MongoDB
  await connectDB();

  // Register cron jobs
  deadlineReminder.register();

  // Start HTTP server
  const server = app.listen(config.port, () => {
    logger.info('Server started', {
      port:        config.port,
      environment: config.env,
      pid:         process.pid,
      nodeVersion: process.version,
    });
  });

  // ── Graceful shutdown ──────────────────────────────────────────
  const shutdown = (signal) => {
    logger.info(`${signal} received — shutting down gracefully`, { signal });

    server.close(() => {
      logger.info('HTTP server closed');
      process.exit(0);
    });

    // Force-kill after 10 s if connections don't drain
    setTimeout(() => {
      logger.error('Forced shutdown — connections did not drain in time');
      process.exit(1);
    }, 10_000).unref();   // .unref() so the timer doesn't keep the process alive
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT',  () => shutdown('SIGINT'));

  // ── Unhandled rejections ───────────────────────────────────────
  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled Promise Rejection', {
      reason: reason instanceof Error ? reason.message : String(reason),
      stack:  reason instanceof Error ? reason.stack   : undefined,
    });
    server.close(() => process.exit(1));
  });

  // ── Uncaught exceptions ────────────────────────────────────────
  process.on('uncaughtException', (err) => {
    // ERR_HTTP_HEADERS_SENT is a non-fatal response lifecycle error —
    // log it but do not crash the process.
    if (err.code === 'ERR_HTTP_HEADERS_SENT') {
      logger.warn('Suppressed ERR_HTTP_HEADERS_SENT', { message: err.message });
      return;
    }
    logger.error('Uncaught Exception — process will exit', {
      message: err.message,
      stack:   err.stack,
    });
    process.exit(1);
  });
};

start();
