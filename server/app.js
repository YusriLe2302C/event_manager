'use strict';

// ── Config must be loaded first — validates env and exits on failure
const config = require('./config/env');

const express      = require('express');
const cors         = require('cors');
const cookieParser = require('cookie-parser');
const path         = require('path');

const applyProductionMiddleware = require('./middleware/production.middleware');
const requestLogger  = require('./middleware/requestLogger.middleware');
const { apiLimiter } = require('./middleware/rateLimiter.middleware');
const { noSqlSanitize, xssSanitize } = require('./middleware/sanitize.middleware');
const errorHandler   = require('./middleware/errorHandler.middleware');
const logger         = require('./utils/logger');

const app = express();

// ── 1. Production middleware (compression, helmet, timeout) ────────
// Applied first so every subsequent handler benefits from compression
// and is protected by security headers.
applyProductionMiddleware(app);

// ── 2. CORS ────────────────────────────────────────────────────────
app.use(
  cors({
    origin: (origin, cb) => {
      // Allow requests with no origin (curl, mobile apps, server-to-server)
      if (!origin) return cb(null, true);
      if (config.cors.origins.includes(origin)) return cb(null, true);
      cb(new Error(`CORS: origin "${origin}" not allowed`));
    },
    credentials:    true,
    methods:        ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// ── 3. Body parsing ────────────────────────────────────────────────
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());

// ── 4. Sanitization ───────────────────────────────────────────────
app.use(noSqlSanitize); // strip $-prefixed keys — NoSQL injection
app.use(xssSanitize);   // escape HTML in all string values — XSS

// ── 5. Request logging ─────────────────────────────────────────────
app.use(requestLogger);

// ── 5. Static file serving ─────────────────────────────────────────
const UPLOAD_DIR = path.resolve(__dirname, config.upload.path);

app.use(
  '/uploads',
  (req, res, next) => {
    const ext = path.extname(req.path).toLowerCase();

    // Force PDF download — never render in browser
    if (ext === '.pdf') {
      res.setHeader('Content-Disposition', 'attachment');
      res.setHeader('X-Content-Type-Options', 'nosniff');
    }

    // Block executable / web file types from being served
    const BLOCKED = ['.js', '.mjs', '.html', '.htm', '.php', '.sh', '.py', '.rb'];
    if (BLOCKED.includes(ext)) {
      logger.warn('Blocked forbidden file type from uploads', { path: req.path, ip: req.ip });
      return res.status(403).json({ success: false, message: 'Forbidden file type' });
    }

    next();
  },
  express.static(UPLOAD_DIR, {
    dotfiles: 'deny',
    index:    false,
    etag:     true,
    maxAge:   config.isProd ? '7d' : '0',
  })
);

// ── 6. Global API rate limit ───────────────────────────────────────
app.use('/api', apiLimiter);

// ── 7. Routes ──────────────────────────────────────────────────────
app.use('/api/auth',          require('./routes/auth.routes'));
app.use('/api/users',         require('./routes/user.routes'));
app.use('/api/colleges',      require('./routes/college.routes'));
app.use('/api/events',        require('./routes/event.routes'));
app.use('/api/registrations', require('./routes/registration.routes'));
app.use('/api/notifications', require('./routes/notification.routes'));
app.use('/api/admin',         require('./routes/admin.routes'));

// ── 8. Health check ────────────────────────────────────────────────
app.get('/health', (req, res) =>
  res.json({
    success:     true,
    message:     'Server is running',
    environment: config.env,
    timestamp:   new Date().toISOString(),
  })
);

// ── 9. 404 handler ─────────────────────────────────────────────────
app.use((req, res) => {
  logger.warn('Route not found', { method: req.method, url: req.originalUrl, ip: req.ip });
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
});

// ── 10. Centralised error handler ──────────────────────────────────
app.use(errorHandler);

module.exports = app;
