'use strict';

const { verifyAccessToken } = require('../utils/generateToken');
const User     = require('../models/User.model');
const ApiError = require('../utils/ApiError');
const logger   = require('../utils/logger');

// Fully async — handles both sync JWT errors and async DB checks uniformly
const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer '))
      return next(ApiError.unauthorized('Access token required'));

    const token   = authHeader.split(' ')[1];
    const decoded = verifyAccessToken(token); // throws synchronously on bad token

    const user = await User.findById(decoded.id).select('passwordChangedAt isActive');
    if (!user || !user.isActive) {
      logger.auth('token_rejected_inactive', { userId: decoded.id, ip: req.ip });
      return next(ApiError.unauthorized('Account inactive'));
    }
    if (user.passwordChangedAfter(decoded.iat)) {
      logger.auth('token_rejected_pw_changed', { userId: decoded.id, ip: req.ip });
      return next(ApiError.unauthorized('Password changed — please log in again'));
    }

    req.user = decoded;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      logger.auth('token_expired', { ip: req.ip, userAgent: req.headers['user-agent'], route: req.originalUrl });
      return next(ApiError.unauthorized('Token expired'));
    }
    if (err.name === 'JsonWebTokenError') {
      logger.auth('token_invalid', { ip: req.ip, userAgent: req.headers['user-agent'], route: req.originalUrl });
      return next(ApiError.unauthorized('Invalid token'));
    }
    next(err);
  }
};

// requireRole('superadmin') or requireRole(['superadmin', 'faculty'])
const requireRole = (roles) => (req, res, next) => {
  const allowed = Array.isArray(roles) ? roles : [roles];
  if (!allowed.includes(req.user?.role)) {
    logger.auth('role_denied', {
      userId:       req.user?.id,
      userRole:     req.user?.role,
      requiredRole: allowed,
      route:        req.originalUrl,
      ip:           req.ip,
    });
    return next(ApiError.forbidden('Insufficient permissions'));
  }
  next();
};

// Faculty must belong to a verified college
const requireVerifiedCollege = async (req, res, next) => {
  try {
    const User    = require('../models/User.model');
    const College = require('../models/College.model');
    const user    = await User.findById(req.user.id).select('college role');
    if (user.role === 'superadmin') return next();
    if (!user.college)
      return next(ApiError.forbidden('No college associated with your account'));
    const college = await College.findById(user.college).select('verificationStatus name');
    if (!college)
      return next(ApiError.forbidden('College not found'));
    if (college.verificationStatus !== 'verified') {
      logger.auth('college_not_verified', {
        userId:             req.user.id,
        collegeId:          user.college,
        verificationStatus: college.verificationStatus,
        route:              req.originalUrl,
      });
      const messages = {
        pending:  'Your college is pending verification by the Super Admin',
        rejected: 'Your college verification was rejected. Contact support.',
      };
      return next(ApiError.forbidden(
        messages[college.verificationStatus] ?? 'College not verified'
      ));
    }
    req.collegeId = user.college;
    next();
  } catch (err) {
    next(err);
  }
};

// Faculty must belong to an approved college (legacy — kept for backward compat)
const requireApprovedCollege = async (req, res, next) => {
  try {
    const User    = require('../models/User.model');
    const College = require('../models/College.model');
    const user    = await User.findById(req.user.id).select('college role');
    if (user.role === 'superadmin') return next();
    if (!user.college) return next(ApiError.forbidden('No college associated'));
    const college = await College.findById(user.college).select('status verificationStatus');
    if (college?.verificationStatus !== 'verified') {
      logger.auth('college_not_approved', {
        userId:    req.user.id,
        collegeId: user.college,
        status:    college?.verificationStatus,
        route:     req.originalUrl,
      });
      return next(ApiError.forbidden('College not yet verified'));
    }
    req.collegeId = user.college;
    next();
  } catch (err) {
    next(err);
  }
};

module.exports = { verifyToken, requireRole, requireVerifiedCollege, requireApprovedCollege };
