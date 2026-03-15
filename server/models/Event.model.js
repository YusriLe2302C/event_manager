const mongoose = require('mongoose');

// ── Sub-schemas ────────────────────────────────────────────────────

const prizeSchema = new mongoose.Schema(
  {
    position:    { type: String, required: true, trim: true }, // "1st Place", "Runner Up"
    description: { type: String, trim: true, default: null },
    value:       { type: String, trim: true, default: null },  // "₹10,000" or "Internship"
  },
  { _id: false }
);

const eligibilitySchema = new mongoose.Schema(
  {
    minYear:    { type: Number, min: 1, max: 6, default: null },
    maxYear:    { type: Number, min: 1, max: 6, default: null },
    branches:   { type: [String], default: [] },   // [] means all branches
    colleges:   { type: [String], default: [] },   // [] means open to all
    otherCriteria: { type: String, default: null },
  },
  { _id: false }
);

// ── Main schema ────────────────────────────────────────────────────

const eventSchema = new mongoose.Schema(
  {
    // ── Core ───────────────────────────────────────────────────────
    title: {
      type: String,
      required: [true, 'Event title is required'],
      trim: true,
      minlength: [5,   'Title must be at least 5 characters'],
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      required: [true, 'Event description is required'],
      minlength: [20, 'Description must be at least 20 characters'],
    },
    type: {
      type: String,
      required: [true, 'Event type is required'],
      enum: {
        values: ['hackathon', 'workshop', 'seminar', 'competition', 'webinar', 'other'],
        message: 'Invalid event type',
      },
    },

    // ── Ownership ──────────────────────────────────────────────────
    college:   {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'College',
      required: [true, 'Event must belong to a college'],
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Event must have a creator'],
    },

    // ── File assets ────────────────────────────────────────────────
    bannerImage:       { type: String, default: null },
    posterImage:       { type: String, default: null },
    brochurePdf:       { type: String, default: null },
    rulebookPdf:       { type: String, default: null },
    workshopMaterials: { type: [String], default: [] },

    // ── Schedule ───────────────────────────────────────────────────
    startDate: {
      type: Date,
      required: [true, 'Start date is required'],
    },
    endDate: {
      type: Date,
      required: [true, 'End date is required'],
    },
    registrationDeadline: {
      type: Date,
      required: [true, 'Registration deadline is required'],
    },

    // ── Location ───────────────────────────────────────────────────
    venue:    { type: String, trim: true, default: null },
    // Normalised city/location string for filtering (e.g. "Bangalore", "Chennai")
    location: { type: String, trim: true, lowercase: true, default: null },
    isOnline: { type: Boolean, default: false },
    meetLink: {
      type: String,
      trim: true,
      default: null,
      validate: {
        validator: function (v) {
          if (!this.isOnline) return true;       // only required when online
          return !v || /^https?:\/\/.+/.test(v); // must be a valid URL if provided
        },
        message: 'Meet link must be a valid URL',
      },
    },

    // ── Capacity & fees ────────────────────────────────────────────
    totalSeats: {
      type: Number,
      required: [true, 'Total seats is required'],
      min: [1, 'Must have at least 1 seat'],
      max: [100000, 'Seat count seems unrealistic'],
    },
    registeredCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    isFree: { type: Boolean, default: true },
    fee: {
      type: Number,
      default: 0,
      min: [0, 'Fee cannot be negative'],
      validate: {
        validator: function (v) {
          return this.isFree ? v === 0 : v >= 0;
        },
        message: 'Fee must be 0 for free events',
      },
    },

    // ── Team settings ──────────────────────────────────────────────
    isTeamEvent:  { type: Boolean, default: false },
    minTeamSize:  { type: Number, min: 1, default: 1 },
    maxTeamSize:  {
      type: Number,
      min: 1,
      default: 1,
      validate: {
        validator: function (v) { return v >= this.minTeamSize; },
        message: 'Max team size must be >= min team size',
      },
    },

    // ── Metadata ───────────────────────────────────────────────────
    tags: {
      type: [{ type: String, trim: true, maxlength: 30 }],
      default: [],
      validate: {
        validator: (arr) => arr.length <= 10,
        message: 'Cannot have more than 10 tags',
      },
    },
    prizes:      { type: [prizeSchema],      default: [] },
    eligibility: { type: eligibilitySchema,  default: () => ({}) },
    externalLink:{
      type: String,
      trim: true,
      match: [/^https?:\/\/.+/, 'External link must be a valid URL'],
      default: null,
    },
    viewCount: { type: Number, default: 0, min: 0 },

    // ── Moderation ─────────────────────────────────────────────────
    status: {
      type: String,
      enum: {
        values: ['pending', 'approved', 'rejected', 'draft', 'published', 'cancelled', 'completed', 'flagged'],
        message: 'Invalid event status',
      },
      default: 'pending',
    },
    // Approval workflow
    approvedBy:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    approvedAt:      { type: Date, default: null },
    rejectionReason: { type: String, trim: true, default: null },
    // Legacy moderation
    moderationNote: { type: String, default: null, select: false },
    flaggedBy:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    flaggedAt:      { type: Date, default: null },
  },
  {
    timestamps: true,
    toJSON:   { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ── Virtuals ───────────────────────────────────────────────────────

eventSchema.virtual('seatsAvailable').get(function () {
  return Math.max(0, this.totalSeats - this.registeredCount);
});

eventSchema.virtual('isFull').get(function () {
  return this.registeredCount >= this.totalSeats;
});

eventSchema.virtual('isRegistrationOpen').get(function () {
  const now = new Date();
  return (
    this.status === 'approved' &&
    now <= this.registrationDeadline &&
    !this.isFull
  );
});

// ── Cross-field date validation ────────────────────────────────────

eventSchema.pre('validate', function (next) {
  if (this.endDate && this.startDate && this.endDate < this.startDate)
    this.invalidate('endDate', 'End date must be after start date');

  if (
    this.registrationDeadline &&
    this.startDate &&
    this.registrationDeadline > this.startDate
  )
    this.invalidate(
      'registrationDeadline',
      'Registration deadline must be before or on the start date'
    );

  next();
});

// ── Indexes ────────────────────────────────────────────────────────

// Primary browse query: college events by type and status
eventSchema.index({ college: 1, type: 1, status: 1 });

// Homepage feed: approved events sorted by date
eventSchema.index({ status: 1, startDate: 1 });

// Pending approval queue for admin
eventSchema.index({ status: 1, createdAt: -1 });

// Faculty dashboard: events created by a specific user
eventSchema.index({ createdBy: 1, status: 1 });

// Date-range queries
eventSchema.index({ startDate: 1, endDate: 1 });

// Registration deadline filter
eventSchema.index({ registrationDeadline: 1, status: 1 });

// Full-text search — title weighted highest, then tags, then description
eventSchema.index(
  { title: 'text', tags: 'text', description: 'text' },
  { weights: { title: 10, tags: 5, description: 1 }, name: 'event_text_search' }
);

// Tag filtering
eventSchema.index({ tags: 1 });

// Location filter
eventSchema.index({ location: 1, status: 1 });

// Online/offline filter
eventSchema.index({ isOnline: 1, status: 1 });

// Free/paid filter
eventSchema.index({ isFree: 1, status: 1 });

// Upcoming events (status + startDate range)
eventSchema.index({ status: 1, startDate: 1, endDate: 1 });

// Trending / popular events
eventSchema.index({ viewCount: -1, status: 1 });

module.exports = mongoose.model('Event', eventSchema);
