'use strict';

const User = require('../models/User.model');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} = require('../utils/generateToken');
const bcrypt = require('bcryptjs');
const {
  isAccountLocked,
  recordFailedAttempt,
  clearFailedAttempts,
} = require('../middleware/loginProtection.middleware');
const config = require('../config/env');
const logger = require('../utils/logger');

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure:   config.isProd,
  sameSite: 'strict',
  maxAge:   7 * 24 * 60 * 60 * 1000,
};

const register = async (req, res, next) => {
  try {
    const { name, email, password, role = 'student', collegeId } = req.body;

    const exists = await User.findOne({ email });
    if (exists) throw ApiError.conflict('Email already registered');

    const user = await User.create({
      name,
      email,
      password,
      role,
      college: role === 'faculty' ? collegeId : undefined,
    });

    const payload      = { id: user._id, role: user.role, email: user.email };
    const accessToken  = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    user.refreshToken = await bcrypt.hash(refreshToken, 10);
    await user.save({ validateBeforeSave: false });

    logger.auth('register_success', {
      userId: user._id,
      email:  user.email,
      role:   user.role,
      ip:     req.ip,
    });

    res.cookie('refreshToken', refreshToken, COOKIE_OPTIONS);
    ApiResponse.created(res, 'Registration successful', {
      accessToken,
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    if (err.statusCode !== 409) {
      logger.auth('register_failed', {
        email:  req.body?.email,
        reason: err.message,
        ip:     req.ip,
      });
    }
    next(err);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+password +refreshToken +loginAttempts +lockUntil');

    // Account-level lockout — skipped in development, checked in production
    if (user && isAccountLocked(user) && config.isProd) {
      const remaining = Math.ceil((user.lockUntil - Date.now()) / 60_000);
      logger.auth('login_blocked', { userId: user._id, email, reason: 'account_locked', ip: req.ip });
      throw ApiError.tooManyRequests(`Account locked. Try again in ${remaining} minute(s).`);
    }

    if (!user || !(await user.comparePassword(password))) {
      if (req._loginFailed) req._loginFailed();
      if (user) await recordFailedAttempt(user);
      logger.auth('login_failed', {
        email,
        reason:    'invalid_credentials',
        ip:        req.ip,
        userAgent: req.headers['user-agent'],
      });
      throw ApiError.unauthorized('Invalid credentials');
    }

    if (!user.isActive) {
      logger.auth('login_blocked', { userId: user._id, email, reason: 'account_suspended', ip: req.ip });
      throw ApiError.forbidden('Account suspended');
    }

    // Clear brute-force counters on successful login
    await clearFailedAttempts(user);
    if (req._loginSuccess) req._loginSuccess();

    const loginPayload = { id: user._id, role: user.role, email: user.email };
    const accessToken  = generateAccessToken(loginPayload);
    const refreshToken = generateRefreshToken(loginPayload);

    user.refreshToken  = await bcrypt.hash(refreshToken, 10);
    user.lastLoginAt   = new Date();
    await user.save({ validateBeforeSave: false });

    logger.auth('login_success', {
      userId:    user._id,
      email:     user.email,
      role:      user.role,
      ip:        req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.cookie('refreshToken', refreshToken, COOKIE_OPTIONS);
    ApiResponse.success(res, 'Login successful', {
      accessToken,
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    next(err);
  }
};

const refresh = async (req, res, next) => {
  try {
    const token = req.cookies?.refreshToken;
    if (!token) throw ApiError.unauthorized('Refresh token missing');

    let decoded;
    try {
      decoded = verifyRefreshToken(token);
    } catch {
      logger.auth('refresh_failed', { reason: 'invalid_token', ip: req.ip });
      throw ApiError.unauthorized('Invalid or expired refresh token');
    }

    const user = await User.findById(decoded.id).select('+refreshToken');
    if (!user) throw ApiError.unauthorized('User not found');

    const isValid = await bcrypt.compare(token, user.refreshToken);
    if (!isValid) {
      logger.auth('refresh_failed', {
        userId: decoded.id,
        reason: 'token_mismatch',
        ip:     req.ip,
      });
      throw ApiError.unauthorized('Refresh token mismatch');
    }

    const payload         = { id: user._id, role: user.role, email: user.email };
    const newAccessToken  = generateAccessToken(payload);
    const newRefreshToken = generateRefreshToken(payload);

    user.refreshToken = await bcrypt.hash(newRefreshToken, 10);
    await user.save({ validateBeforeSave: false });

    res.cookie('refreshToken', newRefreshToken, COOKIE_OPTIONS);
    ApiResponse.success(res, 'Token refreshed', { accessToken: newAccessToken });
  } catch (err) {
    next(err);
  }
};

const logout = async (req, res, next) => {
  try {
    await User.findByIdAndUpdate(req.user.id, { refreshToken: null });
    logger.auth('logout', {
      userId: req.user.id,
      ip:     req.ip,
    });
    res.clearCookie('refreshToken');
    ApiResponse.success(res, 'Logged out successfully');
  } catch (err) {
    next(err);
  }
};

module.exports = { register, login, refresh, logout };
