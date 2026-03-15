const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    // ── Recipient ──────────────────────────────────────────────────
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Recipient is required'],
    },

    // ── Sender (null = system-generated) ──────────────────────────
    sentBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },

    // ── Content ────────────────────────────────────────────────────
    type: {
      type: String,
      required: [true, 'Notification type is required'],
      enum: {
        values: [
          'registration_confirmed',
          'registration_cancelled',
          'event_published',
          'event_updated',
          'event_cancelled',
          'event_reminder',
          'event_completed',
          'announcement',
          'college_approved',
          'college_rejected',
          'college_suspended',
          'account_suspended',
          'account_reactivated',
          'system',
        ],
        message: 'Invalid notification type',
      },
    },
    title: {
      type: String,
      required: [true, 'Notification title is required'],
      trim: true,
      maxlength: [150, 'Title cannot exceed 150 characters'],
    },
    message: {
      type: String,
      required: [true, 'Notification message is required'],
      maxlength: [1000, 'Message cannot exceed 1000 characters'],
    },

    // ── Priority ───────────────────────────────────────────────────
    priority: {
      type: String,
      enum: {
        values: ['low', 'normal', 'high', 'urgent'],
        message: 'Invalid priority level',
      },
      default: 'normal',
    },

    // ── State ──────────────────────────────────────────────────────
    read:   { type: Boolean, default: false },
    readAt: { type: Date,    default: null },

    // ── Deep link ──────────────────────────────────────────────────
    // Frontend uses this to navigate on notification click
    actionUrl: { type: String, default: null },

    // ── Related documents ──────────────────────────────────────────
    relatedEvent:   { type: mongoose.Schema.Types.ObjectId, ref: 'Event',   default: null },
    relatedCollege: { type: mongoose.Schema.Types.ObjectId, ref: 'College', default: null },

    // ── TTL: auto-delete old notifications after 90 days ──────────
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
    },
  },
  {
    timestamps: true,
    toJSON:   { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ── Hooks ──────────────────────────────────────────────────────────

notificationSchema.pre('save', function (next) {
  if (this.isModified('read') && this.read && !this.readAt)
    this.readAt = new Date();
  next();
});

// ── Indexes ────────────────────────────────────────────────────────

// Primary inbox query: unread notifications for a user, newest first
notificationSchema.index({ recipient: 1, read: 1, createdAt: -1 });

// Unread count badge
notificationSchema.index({ recipient: 1, read: 1 });

// Priority inbox filter
notificationSchema.index({ recipient: 1, priority: 1, read: 1 });

// TTL index — MongoDB auto-deletes documents when expiresAt is reached
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Notification', notificationSchema);
