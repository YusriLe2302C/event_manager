'use strict';

const College      = require('../models/College.model');
const User         = require('../models/User.model');
const Event        = require('../models/Event.model');
const Registration = require('../models/Registration.model');
const AdminLog     = require('../models/AdminLog.model');
const ApiError     = require('../utils/ApiError');
const ApiResponse  = require('../utils/ApiResponse');
const notif            = require('../services/notification.service');
const analyticsService = require('../services/analytics.service');
const { clearCache }   = require('../middleware/cache.middleware');
const logger           = require('../utils/logger');

// ── Helper: write MongoDB audit log + Winston admin log ───────────
const writeLog = async (req, fields) => {
  // Winston structured log (goes to audit.log)
  logger.admin(fields.action, {
    performedBy:  req.user.id,
    targetType:   fields.targetType,
    targetId:     fields.targetId,
    description:  fields.description,
    severity:     fields.severity ?? 'info',
    ip:           req.ip,
    userAgent:    req.headers['user-agent'],
  });

  // MongoDB immutable audit trail
  return AdminLog.create({
    performedBy: req.user.id,
    ipAddress:   req.ip,
    userAgent:   req.headers['user-agent'] || null,
    ...fields,
  }).catch((e) => logger.error('AdminLog write failed', { error: e.message }));
};

// ── College Verification Workflow ─────────────────────────────────

const getPendingColleges = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, verificationStatus = 'pending' } = req.query;
    const ALLOWED = ['pending', 'verified', 'rejected'];
    if (!ALLOWED.includes(verificationStatus))
      throw ApiError.badRequest('Invalid verificationStatus filter');
    const skip = (page - 1) * limit;
    const [colleges, total] = await Promise.all([
      College.find({ verificationStatus })
        .populate('createdBy', 'name email')
        .sort({ createdAt: 1 })
        .skip(skip)
        .limit(Number(limit)),
      College.countDocuments({ verificationStatus }),
    ]);
    ApiResponse.paginated(res, 'Colleges fetched', colleges, {
      total, page: Number(page), limit: Number(limit),
      pages: Math.ceil(total / limit),
    });
  } catch (err) { next(err); }
};

const getCollegeProfile = async (req, res, next) => {
  try {
    const college = await College.findById(req.params.id)
      .populate('createdBy', 'name email designation');
    if (!college) throw ApiError.notFound('College not found');
    ApiResponse.success(res, 'College profile fetched', college);
  } catch (err) { next(err); }
};

const verifyCollege = async (req, res, next) => {
  try {
    const college = await College.findById(req.params.id)
      .populate('createdBy', '_id name');
    if (!college) throw ApiError.notFound('College not found');
    if (college.verificationStatus !== 'pending')
      throw ApiError.conflict('College is already ' + college.verificationStatus);
    college.verificationStatus = 'verified';
    college.verifiedBy         = req.user.id;
    college.verifiedAt         = new Date();
    college.status             = 'approved';
    college.approvedBy         = req.user.id;
    college.approvedAt         = new Date();
    college.reviewedAt         = new Date();
    await college.save();
    if (college.createdBy) await notif.collegeApproved(college.createdBy._id, college);
    await writeLog(req, {
      action:        'college_verified',
      description:   'College "' + college.name + '" verified.',
      targetType:    'College',
      targetId:      college._id,
      previousValue: { verificationStatus: 'pending' },
      newValue:      { verificationStatus: 'verified' },
      severity:      'info',
    });
    clearCache('/api/colleges');
    ApiResponse.success(res, 'College verified', college);
  } catch (err) { next(err); }
};

const rejectCollege = async (req, res, next) => {
  try {
    const { reason } = req.body;
    const college = await College.findById(req.params.id)
      .populate('createdBy', '_id name');
    if (!college) throw ApiError.notFound('College not found');
    if (college.verificationStatus !== 'pending')
      throw ApiError.conflict('College is already ' + college.verificationStatus);
    college.verificationStatus          = 'rejected';
    college.verificationRejectionReason = reason.trim();
    college.status                      = 'rejected';
    college.rejectionReason             = reason.trim();
    college.reviewedAt                  = new Date();
    await college.save();
    if (college.createdBy) await notif.collegeRejected(college.createdBy._id, college, reason);
    await writeLog(req, {
      action:        'college_rejected',
      description:   'College "' + college.name + '" rejected. Reason: ' + reason,
      targetType:    'College',
      targetId:      college._id,
      previousValue: { verificationStatus: 'pending' },
      newValue:      { verificationStatus: 'rejected', reason },
      severity:      'warning',
    });
    clearCache('/api/colleges');
    ApiResponse.success(res, 'College rejected', college);
  } catch (err) { next(err); }
};

// ── College review (legacy PUT - kept for backward compat) ─────────
const reviewCollege = async (req, res, next) => {
  try {
    const { action, reason } = req.body;
    if (!['approve', 'reject'].includes(action))
      throw ApiError.badRequest('Action must be approve or reject');

    const college = await College.findById(req.params.id).populate('createdBy', '_id');
    if (!college) throw ApiError.notFound('College not found');
    if (college.status !== 'pending')
      throw ApiError.conflict('College already reviewed');

    const previousStatus    = college.status;
    college.status          = action === 'approve' ? 'approved' : 'rejected';
    college.rejectionReason = action === 'reject' ? reason : undefined;
    college.approvedBy      = req.user.id;
    college.approvedAt      = new Date();
    college.reviewedAt      = new Date();
    await college.save();

    if (action === 'approve') {
      await notif.collegeApproved(college.createdBy._id, college);
    } else {
      await notif.collegeRejected(college.createdBy._id, college, reason);
    }

    await writeLog(req, {
      action:        action === 'approve' ? 'college_approved' : 'college_rejected',
      description:   `College "${college.name}" ${action}d.${reason ? ' Reason: ' + reason : ''}`,
      targetType:    'College',
      targetId:      college._id,
      previousValue: { status: previousStatus },
      newValue:      { status: college.status },
      severity:      'info',
    });

    clearCache('/api/colleges');
    ApiResponse.success(res, `College ${action}d`, college);
  } catch (err) {
    next(err);
  }
};

// ── College Edit Approval Workflow ──────────────────────────────────

const getPendingCollegeEdits = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;
    const [colleges, total] = await Promise.all([
      College.find({ editStatus: 'pending' })
        .populate('createdBy', 'name email')
        .sort({ 'pendingEdit.submittedAt': 1 })
        .skip(skip)
        .limit(Number(limit)),
      College.countDocuments({ editStatus: 'pending' }),
    ]);
    ApiResponse.paginated(res, 'Pending edits fetched', colleges, {
      total, page: Number(page), limit: Number(limit),
      pages: Math.ceil(total / limit),
    });
  } catch (err) { next(err); }
};

const approveCollegeEdit = async (req, res, next) => {
  try {
    const college = await College.findById(req.params.id).populate('createdBy', '_id name');
    if (!college) throw ApiError.notFound('College not found');
    if (college.editStatus !== 'pending') throw ApiError.conflict('No pending edit to approve');

    const edit = college.pendingEdit;
    if (edit.name)               college.name        = edit.name;
    if (edit.email)              college.email       = edit.email;
    if (edit.phone  != null)     college.phone       = edit.phone;
    if (edit.website != null)    college.website     = edit.website;
    if (edit.description != null) college.description = edit.description;
    if (edit.address)            college.address     = edit.address;
    if (edit.logoUrl)            college.logoUrl     = edit.logoUrl;

    college.editStatus          = 'approved';
    college.editRejectionReason = null;
    college.pendingEdit         = {};
    await college.save();

    if (college.createdBy) await notif.collegeEditApproved(college.createdBy._id, college);
    await writeLog(req, {
      action: 'college_edit_approved',
      description: `College "${college.name}" edit approved.`,
      targetType: 'College', targetId: college._id, severity: 'info',
    });
    clearCache('/api/colleges');
    ApiResponse.success(res, 'College edit approved', college);
  } catch (err) { next(err); }
};

const rejectCollegeEdit = async (req, res, next) => {
  try {
    const { reason } = req.body;
    if (!reason?.trim()) throw ApiError.badRequest('Rejection reason is required');

    const college = await College.findById(req.params.id).populate('createdBy', '_id name');
    if (!college) throw ApiError.notFound('College not found');
    if (college.editStatus !== 'pending') throw ApiError.conflict('No pending edit to reject');

    college.editStatus          = 'rejected';
    college.editRejectionReason = reason.trim();
    college.pendingEdit         = {};
    await college.save();

    if (college.createdBy) await notif.collegeEditRejected(college.createdBy._id, college, reason);
    await writeLog(req, {
      action: 'college_edit_rejected',
      description: `College "${college.name}" edit rejected. Reason: ${reason}`,
      targetType: 'College', targetId: college._id, severity: 'warning',
    });
    clearCache('/api/colleges');
    ApiResponse.success(res, 'College edit rejected', college);
  } catch (err) { next(err); }
};

// ── User Management ────────────────────────────────────────────────

const getUsers = async (req, res, next) => {
  try {
    const { page = 1, limit = 30, role, isActive, search } = req.query;
    const safeLimit = Math.min(100, Math.max(1, Number(limit)));
    const filter = {};
    if (role)              filter.role     = role;
    if (isActive !== undefined) filter.isActive = isActive === 'true';
    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [
        { name:  { $regex: escaped, $options: 'i' } },
        { email: { $regex: escaped, $options: 'i' } },
      ];
    }

    const skip = (page - 1) * safeLimit;
    const [users, total] = await Promise.all([
      User.find(filter)
        .select('-refreshToken')
        .populate('college', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(safeLimit),
      User.countDocuments(filter),
    ]);

    ApiResponse.paginated(res, 'Users fetched', users, {
      total, page: Number(page), limit: safeLimit,
      pages: Math.ceil(total / safeLimit),
    });
  } catch (err) {
    next(err);
  }
};

const toggleUserStatus = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select('isActive role name email');
    if (!user) throw ApiError.notFound('User not found');
    if (user.role === 'superadmin')
      throw ApiError.forbidden('Cannot modify superadmin accounts');

    const previousStatus  = user.isActive;
    user.isActive         = !user.isActive;
    if (!user.isActive) {
      user.isSuspended      = true;
      user.suspensionReason = req.body.reason || null;
    } else {
      user.isSuspended      = false;
      user.suspensionReason = null;
    }
    await user.save();

    if (user.isActive) {
      await notif.accountReactivated(user._id);
    } else {
      await notif.accountSuspended(user._id, req.body.reason);
    }

    await writeLog(req, {
      action:        user.isActive ? 'user_reactivated' : 'user_suspended',
      description:   `User "${user.name}" (${user.email}) ${user.isActive ? 'reactivated' : 'suspended'}.`,
      targetType:    'User',
      targetId:      user._id,
      previousValue: { isActive: previousStatus },
      newValue:      { isActive: user.isActive },
      severity:      user.isActive ? 'info' : 'warning',
    });

    ApiResponse.success(res, `User ${user.isActive ? 'activated' : 'suspended'}`, {
      isActive: user.isActive,
    });
  } catch (err) {
    next(err);
  }
};

// ── Event Approval Workflow ───────────────────────────────────────

const getPendingEvents = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status = 'pending' } = req.query;
    const ALLOWED = ['pending', 'approved', 'rejected'];
    if (!ALLOWED.includes(status)) throw ApiError.badRequest('Invalid status filter');

    const skip = (page - 1) * limit;
    const filter = { status };

    const [events, total] = await Promise.all([
      Event.find(filter)
        .populate('college',   'name logoUrl city')
        .populate('createdBy', 'name email designation')
        .select('-moderationNote')
        .sort({ createdAt: 1 })
        .skip(skip)
        .limit(Number(limit)),
      Event.countDocuments(filter),
    ]);

    ApiResponse.paginated(res, 'Events fetched', events, {
      total, page: Number(page), limit: Number(limit),
      pages: Math.ceil(total / limit),
    });
  } catch (err) {
    next(err);
  }
};

const approveEvent = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id).select('title status createdBy college');
    if (!event) throw ApiError.notFound('Event not found');
    if (event.status !== 'pending')
      throw ApiError.conflict(`Event is already ${event.status}`);

    event.status     = 'approved';
    event.approvedBy = req.user.id;
    event.approvedAt = new Date();
    await event.save();

    // Notify the faculty creator
    await notif.eventApproved(event.createdBy, event);

    // Notify all students of the college now that it's live
    const students = await User.find(
      { college: event.college, role: 'student', isActive: true }, '_id'
    ).lean();
    if (students.length) {
      await notif.newEventPublished(students.map((s) => s._id), event);
    }

    await writeLog(req, {
      action:        'event_approved',
      description:   `Event "${event.title}" approved.`,
      targetType:    'Event',
      targetId:      event._id,
      previousValue: { status: 'pending' },
      newValue:      { status: 'approved' },
      severity:      'info',
    });

    clearCache('/api/events');
    ApiResponse.success(res, 'Event approved', event);
  } catch (err) {
    next(err);
  }
};

const rejectEvent = async (req, res, next) => {
  try {
    const { reason } = req.body;
    if (!reason?.trim()) throw ApiError.badRequest('Rejection reason is required');

    const event = await Event.findById(req.params.id).select('title status createdBy');
    if (!event) throw ApiError.notFound('Event not found');
    if (event.status !== 'pending')
      throw ApiError.conflict(`Event is already ${event.status}`);

    event.status          = 'rejected';
    event.rejectionReason = reason.trim();
    await event.save();

    await notif.eventRejected(event.createdBy, event, reason);

    await writeLog(req, {
      action:        'event_rejected',
      description:   `Event "${event.title}" rejected. Reason: ${reason}`,
      targetType:    'Event',
      targetId:      event._id,
      previousValue: { status: 'pending' },
      newValue:      { status: 'rejected', rejectionReason: reason },
      severity:      'warning',
    });

    clearCache('/api/events');
    ApiResponse.success(res, 'Event rejected', event);
  } catch (err) {
    next(err);
  }
};

// ── Event Moderation ───────────────────────────────────────────────

const moderateEvent = async (req, res, next) => {
  try {
    const { action, note } = req.body;
    const validActions = ['flag', 'restore', 'cancel'];
    if (!validActions.includes(action))
      throw ApiError.badRequest('Invalid moderation action');

    const event = await Event.findById(req.params.id).select('title status createdBy');
    if (!event) throw ApiError.notFound('Event not found');

    const previousStatus = event.status;
    const statusMap = { flag: 'flagged', restore: 'approved', cancel: 'cancelled' };

    event.status         = statusMap[action];
    event.moderationNote = note || null;
    if (action === 'flag') {
      event.flaggedBy = req.user.id;
      event.flaggedAt = new Date();
    }
    await event.save();

    // Notifications
    if (action === 'flag') {
      await notif.eventFlaggedForFaculty(event.createdBy, event, note);
      const admins = await User.find({ role: 'superadmin', isActive: true }, '_id').lean();
      if (admins.length) {
        await notif.eventFlaggedForAdmin(admins.map((a) => a._id), event, req.user);
      }
    } else if (action === 'restore') {
      await notif.eventRestoredForFaculty(event.createdBy, event);
    } else if (action === 'cancel') {
      const regs = await Registration.find(
        { event: event._id, status: { $in: ['confirmed', 'waitlisted'] } },
        'student'
      ).lean();
      if (regs.length) {
        await notif.eventCancelled(regs.map((r) => r.student), event);
      }
    }

    // Audit log
    const actionLabel = action === 'restore' ? 'event_restored'
      : action === 'flag'    ? 'event_flagged'
      : 'event_cancelled';

    await writeLog(req, {
      action:        actionLabel,
      description:   `Event "${event.title}" ${action}${action === 'restore' ? 'd' : 'ged'}.${note ? ' Note: ' + note : ''}`,
      targetType:    'Event',
      targetId:      event._id,
      previousValue: { status: previousStatus },
      newValue:      { status: event.status },
      severity:      action === 'flag' ? 'warning' : 'info',
    });

    clearCache('/api/events');
    ApiResponse.success(res, `Event ${action}${action === 'restore' ? 'd' : 'ged'}`, event);
  } catch (err) {
    next(err);
  }
};

// ── Admin Logs ─────────────────────────────────────────────────────

const getAdminLogs = async (req, res, next) => {
  try {
    const { page = 1, limit = 50, action, severity, targetType } = req.query;
    const safeLimit = Math.min(200, Math.max(1, Number(limit)));
    const filter = {};
    if (action)     filter.action     = action;
    if (severity)   filter.severity   = severity;
    if (targetType) filter.targetType = targetType;

    const skip = (page - 1) * safeLimit;
    const [logs, total] = await Promise.all([
      AdminLog.find(filter)
        .populate('performedBy', 'name email role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(safeLimit),
      AdminLog.countDocuments(filter),
    ]);

    ApiResponse.paginated(res, 'Admin logs fetched', logs, {
      total, page: Number(page), limit: safeLimit,
      pages: Math.ceil(total / safeLimit),
    });
  } catch (err) {
    next(err);
  }
};

// ── Analytics ─────────────────────────────────────────────────────

const getAnalytics = async (req, res, next) => {
  try {
    const data = await analyticsService.getPlatformStats();
    ApiResponse.success(res, 'Analytics fetched', data);
  } catch (err) {
    next(err);
  }
};

const getCollegeLeaderboard = async (req, res, next) => {
  try {
    const limit = Math.min(50, Math.max(1, Number(req.query.limit ?? 10)));
    const data  = await analyticsService.getMostActiveColleges({ limit });
    ApiResponse.success(res, 'College leaderboard fetched', data);
  } catch (err) {
    next(err);
  }
};

const getPopularEvents = async (req, res, next) => {
  try {
    const limit = Math.min(50, Math.max(1, Number(req.query.limit ?? 10)));
    const data  = await analyticsService.getMostPopularEvents({ limit });
    ApiResponse.success(res, 'Popular events fetched', data);
  } catch (err) {
    next(err);
  }
};

const getRegistrationTrend = async (req, res, next) => {
  try {
    const days      = Math.min(90, Math.max(7, Number(req.query.days ?? 30)));
    const collegeId = req.query.collegeId ?? null;
    const data      = await analyticsService.getRegistrationTrend({ days, collegeId });
    ApiResponse.success(res, 'Registration trend fetched', data);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getPendingColleges,
  getCollegeProfile,
  verifyCollege,
  rejectCollege,
  reviewCollege,
  getPendingCollegeEdits,
  approveCollegeEdit,
  rejectCollegeEdit,
  getUsers,
  toggleUserStatus,
  getPendingEvents,
  approveEvent,
  rejectEvent,
  moderateEvent,
  getAdminLogs,
  getAnalytics,
  getCollegeLeaderboard,
  getPopularEvents,
  getRegistrationTrend,
};
