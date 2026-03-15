const mongoose = require('mongoose');

// ── Sub-schemas ────────────────────────────────────────────────────

const teamMemberSchema = new mongoose.Schema(
  {
    user:  {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    name:  { type: String, trim: true, required: true },
    email: { type: String, trim: true, lowercase: true, required: true },
    role:  { type: String, trim: true, default: 'Member' }, // "Leader", "Member"
  },
  { _id: false }
);

// ── Main schema ────────────────────────────────────────────────────

const registrationSchema = new mongoose.Schema(
  {
    // ── Core references ────────────────────────────────────────────
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      required: [true, 'Event reference is required'],
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Student reference is required'],
    },

    // ── Status ─────────────────────────────────────────────────────
    status: {
      type: String,
      enum: {
        values: ['confirmed', 'cancelled', 'waitlisted', 'attended'],
        message: 'Invalid registration status',
      },
      default: 'confirmed',
    },

    // ── Team (for team events) ─────────────────────────────────────
    isTeamRegistration: { type: Boolean, default: false },
    teamName: {
      type: String,
      trim: true,
      maxlength: [100, 'Team name cannot exceed 100 characters'],
      default: null,
    },
    teamMembers: {
      type: [teamMemberSchema],
      default: [],
      validate: {
        validator: (arr) => arr.length <= 10,
        message: 'Team cannot have more than 10 members',
      },
    },

    // ── Payment ────────────────────────────────────────────────────
    paymentStatus: {
      type: String,
      enum: {
        values: ['not_required', 'pending', 'completed', 'failed', 'refunded'],
        message: 'Invalid payment status',
      },
      default: 'not_required',
    },
    paymentAmount: { type: Number, default: 0, min: 0 },
    paymentRef:    { type: String, default: null }, // transaction ID / reference

    // ── Check-in ───────────────────────────────────────────────────
    checkedIn:   { type: Boolean, default: false },
    checkedInAt: { type: Date,    default: null },

    // ── Timestamps ─────────────────────────────────────────────────
    registeredAt: { type: Date, default: Date.now },
    cancelledAt:  { type: Date, default: null },

    // ── Cancellation ───────────────────────────────────────────────
    cancellationReason: { type: String, default: null },
    cancelledBy: {
      type: String,
      enum: ['student', 'faculty', 'admin', null],
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON:   { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ── Virtuals ───────────────────────────────────────────────────────

registrationSchema.virtual('teamSize').get(function () {
  return this.isTeamRegistration ? this.teamMembers.length + 1 : 1;
});

// ── Indexes ────────────────────────────────────────────────────────

// Core constraint: one registration per student per event
registrationSchema.index({ event: 1, student: 1 }, { unique: true });

// Student's registration history
registrationSchema.index({ student: 1, status: 1, registeredAt: -1 });

// Faculty: all registrations for an event
registrationSchema.index({ event: 1, status: 1 });

// Check-in management at event day
registrationSchema.index({ event: 1, checkedIn: 1 });

// Payment reconciliation
registrationSchema.index({ paymentStatus: 1, event: 1 }, { sparse: true });

// Waitlist ordering
registrationSchema.index({ event: 1, status: 1, registeredAt: 1 });

module.exports = mongoose.model('Registration', registrationSchema);
