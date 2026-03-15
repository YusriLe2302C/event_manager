'use strict';

/**
 * config/env.js — Centralised environment configuration
 *
 * Validates every required variable at startup using Zod.
 * Exports a single frozen config object used everywhere in the app.
 * Raw process.env access is intentionally avoided after this point.
 *
 * Load order in server.js:
 *   1. require('dotenv').config()
 *   2. require('./config/env')   ← validates + freezes config
 *   3. require('./app')          ← uses config, never process.env directly
 */

const { z } = require('zod');

// ── Schema ─────────────────────────────────────────────────────────

const envSchema = z.object({

  // Server
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT:     z.coerce.number().int().min(1).max(65535).default(5000),

  // Database
  MONGO_URI:       z.string().min(1, 'MONGO_URI is required'),
  MONGO_POOL_SIZE: z.coerce.number().int().min(1).max(100).default(10),

  // JWT — enforce minimum secret length in production
  JWT_ACCESS_SECRET:  z.string().min(16, 'JWT_ACCESS_SECRET must be at least 16 chars'),
  JWT_REFRESH_SECRET: z.string().min(16, 'JWT_REFRESH_SECRET must be at least 16 chars'),
  JWT_ACCESS_EXPIRES:  z.string().default('15m'),
  JWT_REFRESH_EXPIRES: z.string().default('7d'),

  // CORS — comma-separated origins
  CLIENT_ORIGIN: z.string().default('http://localhost:5173'),
  BASE_URL:      z.string().url('BASE_URL must be a valid URL').default('http://localhost:5000'),

  // File uploads
  UPLOAD_PATH:       z.string().default('uploads'),
  MAX_FILE_SIZE_MB:  z.coerce.number().int().min(1).max(100).default(10),
  MAX_UPLOAD_FILES:  z.coerce.number().int().min(1).max(20).default(5),

  // Rate limiting
  RATE_LIMIT_WINDOW_MS:   z.coerce.number().int().min(1000).default(900_000),
  RATE_LIMIT_MAX_API:     z.coerce.number().int().min(1).default(100),
  RATE_LIMIT_MAX_AUTH:    z.coerce.number().int().min(1).default(10),
  RATE_LIMIT_MAX_UPLOAD:  z.coerce.number().int().min(1).default(20),

  // Request timeout
  REQUEST_TIMEOUT_MS: z.coerce.number().int().min(1000).default(30_000),

  // Cache
  CACHE_TTL_SECONDS:  z.coerce.number().int().min(0).default(300),
  CACHE_CHECK_PERIOD: z.coerce.number().int().min(1).default(60),

  // Logging
  LOG_LEVEL:   z.enum(['error', 'warn', 'audit', 'info', 'http', 'debug']).default('info'),
  LOG_HEADERS: z.enum(['true', 'false']).default('false'),

  // Brute-force protection
  BRUTE_MAX_ATTEMPTS: z.coerce.number().int().min(1).default(5),
  BRUTE_WINDOW_MS:    z.coerce.number().int().min(1000).default(900_000),
  BRUTE_LOCKOUT_MS:   z.coerce.number().int().min(1000).default(1_800_000),

  // Admin seed
  ADMIN_EMAIL:    z.string().email().optional(),
  ADMIN_PASSWORD: z.string().min(8).optional(),
});

// ── Production-only extra rules ────────────────────────────────────

const productionRefinements = (data) => {
  const errors = [];

  if (data.NODE_ENV === 'production') {
    // Reject placeholder secrets
    const PLACEHOLDER = ['your_access_secret_change_in_production',
                         'your_refresh_secret_change_in_production',
                         'CHANGE_ME'];
    if (PLACEHOLDER.some((p) => data.JWT_ACCESS_SECRET.includes(p)))
      errors.push({ path: ['JWT_ACCESS_SECRET'], message: 'Must not use placeholder value in production' });
    if (PLACEHOLDER.some((p) => data.JWT_REFRESH_SECRET.includes(p)))
      errors.push({ path: ['JWT_REFRESH_SECRET'], message: 'Must not use placeholder value in production' });

    // Enforce strong secrets in production (min 32 chars)
    if (data.JWT_ACCESS_SECRET.length < 32)
      errors.push({ path: ['JWT_ACCESS_SECRET'], message: 'Must be at least 32 chars in production' });
    if (data.JWT_REFRESH_SECRET.length < 32)
      errors.push({ path: ['JWT_REFRESH_SECRET'], message: 'Must be at least 32 chars in production' });

    // Must use Atlas or remote Mongo in production
    if (data.MONGO_URI.includes('localhost') || data.MONGO_URI.includes('127.0.0.1'))
      errors.push({ path: ['MONGO_URI'], message: 'localhost MongoDB not allowed in production' });
  }

  return errors;
};

// ── Validate ───────────────────────────────────────────────────────

const validate = () => {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const issues = result.error.issues.map(
      (i) => `  ✗ ${i.path.join('.')}: ${i.message}`
    );
    console.error('\n[Config] Environment validation FAILED:\n' + issues.join('\n') + '\n');
    process.exit(1);
  }

  const data   = result.data;
  const extras = productionRefinements(data);

  if (extras.length > 0) {
    const msgs = extras.map((e) => `  ✗ ${e.path.join('.')}: ${e.message}`);
    console.error('\n[Config] Production environment check FAILED:\n' + msgs.join('\n') + '\n');
    process.exit(1);
  }

  return data;
};

// ── Build typed config object ──────────────────────────────────────

const raw = validate();

const config = Object.freeze({

  env:  raw.NODE_ENV,
  port: raw.PORT,
  isProd: raw.NODE_ENV === 'production',
  isTest: raw.NODE_ENV === 'test',

  db: Object.freeze({
    uri:      raw.MONGO_URI,
    poolSize: raw.MONGO_POOL_SIZE,
  }),

  jwt: Object.freeze({
    accessSecret:   raw.JWT_ACCESS_SECRET,
    refreshSecret:  raw.JWT_REFRESH_SECRET,
    accessExpires:  raw.JWT_ACCESS_EXPIRES,
    refreshExpires: raw.JWT_REFRESH_EXPIRES,
  }),

  cors: Object.freeze({
    // Parse comma-separated origins into an array
    origins: raw.CLIENT_ORIGIN.split(',').map((o) => o.trim()).filter(Boolean),
    baseUrl: raw.BASE_URL,
  }),

  upload: Object.freeze({
    path:        raw.UPLOAD_PATH,
    maxFileMb:   raw.MAX_FILE_SIZE_MB,
    maxFileSizeBytes: raw.MAX_FILE_SIZE_MB * 1024 * 1024,
    maxFiles:    raw.MAX_UPLOAD_FILES,
  }),

  rateLimit: Object.freeze({
    windowMs:  raw.RATE_LIMIT_WINDOW_MS,
    maxApi:    raw.RATE_LIMIT_MAX_API,
    maxAuth:   raw.RATE_LIMIT_MAX_AUTH,
    maxUpload: raw.RATE_LIMIT_MAX_UPLOAD,
  }),

  timeout: raw.REQUEST_TIMEOUT_MS,

  cache: Object.freeze({
    ttl:         raw.CACHE_TTL_SECONDS,
    checkPeriod: raw.CACHE_CHECK_PERIOD,
  }),

  log: Object.freeze({
    level:      raw.LOG_LEVEL,
    logHeaders: raw.LOG_HEADERS === 'true',
  }),

  brute: Object.freeze({
    maxAttempts: raw.BRUTE_MAX_ATTEMPTS,
    windowMs:    raw.BRUTE_WINDOW_MS,
    lockoutMs:   raw.BRUTE_LOCKOUT_MS,
  }),

  admin: Object.freeze({
    email:    raw.ADMIN_EMAIL,
    password: raw.ADMIN_PASSWORD,
  }),
});

module.exports = config;
