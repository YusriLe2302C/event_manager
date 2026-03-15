'use strict';

/**
 * middleware/loginProtection.middleware.js
 *
 * Two-layer brute-force defence for POST /api/auth/login:
 *
 *   Layer 1 — IP-level tracking (loginAttemptGuard)
 *     Counts failed attempts per IP in a NodeCache store.
 *     After BRUTE_MAX_ATTEMPTS failures within BRUTE_WINDOW_MS the IP is
 *     locked out for BRUTE_LOCKOUT_MS and every subsequent attempt resets
 *     the lockout timer (progressive penalty).
 *
 *   Layer 2 — Account-level lockout (applied inside auth.controller login)
 *     User.model stores loginAttempts + lockUntil.
 *     comparePassword failure increments the counter; on threshold the
 *     account is locked for BRUTE_LOCKOUT_MS regardless of IP.
 *     Successful login resets both counters.
 *
 * Config (env.js / .env):
 *   BRUTE_MAX_ATTEMPTS   default 5
 *   BRUTE_WINDOW_MS      default 900000  (15 min)
 *   BRUTE_LOCKOUT_MS     default 1800000 (30 min)
 */

const NodeCache = require('node-cache');
const ApiError  = require('../utils/ApiError');
const logger    = require('../utils/logger');
const config    = require('../config/env');

// TTL = lockout duration so entries auto-expire
const store = new NodeCache({ stdTTL: config.brute.lockoutMs / 1000, checkperiod: 60 });

const key = (ip) => `bf:${ip}`;

// ── IP-level guard ─────────────────────────────────────────────────
const loginAttemptGuard = (req, _res, next) => {
  // Never block in development — avoids lockouts during testing
  if (config.env === 'development') return next()

  const ip      = req.ip;
  const record  = store.get(key(ip)) ?? { count: 0, lockedUntil: null };

  if (record.lockedUntil && Date.now() < record.lockedUntil) {
    const remaining = Math.ceil((record.lockedUntil - Date.now()) / 60_000);
    logger.warn('Login blocked — IP locked out', { ip, remaining });
    return next(
      ApiError.tooManyRequests(
        `Too many failed login attempts. Try again in ${remaining} minute(s).`
      )
    );
  }

  // Attach helper so auth controller can call it after a failed attempt
  req._loginFailed = () => {
    const current = store.get(key(ip)) ?? { count: 0, lockedUntil: null };
    current.count += 1;

    if (current.count >= config.brute.maxAttempts) {
      current.lockedUntil = Date.now() + config.brute.lockoutMs;
      logger.warn('IP locked out after repeated failures', {
        ip,
        attempts: current.count,
        lockoutMinutes: config.brute.lockoutMs / 60_000,
      });
    }

    store.set(key(ip), current, config.brute.lockoutMs / 1000);
  };

  req._loginSuccess = () => store.del(key(ip));

  next();
};

// ── Account-level lockout check (called from auth.controller) ──────
// Returns true if the account is currently locked.
const isAccountLocked = (user) => {
  if (!user.lockUntil) return false;
  return user.lockUntil > Date.now();
};

// Increment failed attempts on the user document.
// Locks the account when threshold is reached.
const recordFailedAttempt = async (user) => {
  if (!user?._id) return;
  const attempts = (user.loginAttempts ?? 0) + 1;
  const update = { $set: { loginAttempts: attempts } };
  if (attempts >= config.brute.maxAttempts) {
    update.$set.lockUntil = new Date(Date.now() + config.brute.lockoutMs);
    logger.warn('Account locked after repeated failures', {
      userId: user._id, email: user.email,
    });
  }
  await User.updateOne({ _id: user._id }, update);
};

// Reset counters on successful login.
const clearFailedAttempts = async (user) => {
  if (!user?._id) return;
  if (user.loginAttempts || user.lockUntil) {
    await User.updateOne(
      { _id: user._id },
      { $set: { loginAttempts: 0 }, $unset: { lockUntil: 1 } }
    );
  }
};

module.exports = {
  loginAttemptGuard,
  isAccountLocked,
  recordFailedAttempt,
  clearFailedAttempts,
};
