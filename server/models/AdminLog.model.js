const mongoose = require('mongoose');

const adminLogSchema = new mongoose.Schema(
  {
    // ── Who performed the action ───────────────────────────────────
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Admin reference is required'],
    },

    // ── What action was taken ──────────────────────────────────────
    action: {
      type: String,
      required: [true, 'Action is required'],
      enum: {
        values: [
          // College actions
          'college_approved',
          'college_rejected',
          'college_suspended',
          'college_restored',
          // User actions
          'user_suspended',
          'user_reactivated',
          'user_role_changed',
          'user_deleted',
          // Event actions
          'event_flagged',
          'event_restored',
          'event_cancelled',
          'event_deleted',
          // System actions
          'platform_announcement',
          'bulk_notification_sent',
        ],
        message: 'Invalid admin action type',
      },
    },

    // ── Human-readable summary ─────────────────────────────────────
    description: {
      type: String,
      required: [true, 'Action description is required'],
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },

    // ── Target document (what was acted upon) ─────────────────────
    targetType: {
      type: String,
      required: [true, 'Target type is required'],
      enum: {
        values: ['User', 'College', 'Event', 'System'],
        message: 'Invalid target type',
      },
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
      // refPath makes Mongoose populate from the correct collection
      refPath: 'targetType',
    },

    // ── Before / after snapshot for reversibility ─────────────────
    previousValue: { type: mongoose.Schema.Types.Mixed, default: null },
    newValue:      { type: mongoose.Schema.Types.Mixed, default: null },

    // ── Request metadata ──────────────────────────────────────────
    ipAddress: { type: String, default: null },
    userAgent: { type: String, default: null },

    // ── Severity ──────────────────────────────────────────────────
    severity: {
      type: String,
      enum: {
        values: ['info', 'warning', 'critical'],
        message: 'Invalid severity level',
      },
      default: 'info',
    },
  },
  {
    // Logs are immutable — no updatedAt needed
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// ── Indexes ────────────────────────────────────────────────────────

// Admin activity feed — what did this admin do, newest first
adminLogSchema.index({ performedBy: 1, createdAt: -1 });

// Audit trail for a specific target (e.g. all actions on college X)
adminLogSchema.index({ targetType: 1, targetId: 1, createdAt: -1 });

// Filter by action type across the platform
adminLogSchema.index({ action: 1, createdAt: -1 });

// Critical action monitoring
adminLogSchema.index({ severity: 1, createdAt: -1 });

// Auto-delete logs older than 1 year (365 days)
adminLogSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 365 * 24 * 60 * 60 }
);

module.exports = mongoose.model('AdminLog', adminLogSchema);
