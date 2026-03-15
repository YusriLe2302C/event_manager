const mongoose = require('mongoose');

// ── Sub-schemas ────────────────────────────────────────────────────

const socialLinksSchema = new mongoose.Schema(
  {
    linkedin:  { type: String, trim: true, default: null },
    twitter:   { type: String, trim: true, default: null },
    instagram: { type: String, trim: true, default: null },
  },
  { _id: false }
);

const addressSchema = new mongoose.Schema(
  {
    street: { type: String, trim: true, default: null },
    city:   { type: String, trim: true, default: null },
    state:  { type: String, trim: true, default: null },
    pincode:{ type: String, trim: true, default: null },
    country:{ type: String, trim: true, default: 'India' },
  },
  { _id: false }
);

// ── Main schema ────────────────────────────────────────────────────

const collegeSchema = new mongoose.Schema(
  {
    // ── Identity ───────────────────────────────────────────────────
    name: {
      type: String,
      required: [true, 'College name is required'],
      trim: true,
      minlength: [3,   'College name must be at least 3 characters'],
      maxlength: [200, 'College name cannot exceed 200 characters'],
    },
    email: {
      type: String,
      required: [true, 'College email is required'],
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },
    phone: {
      type: String,
      trim: true,
      match: [/^\+?[\d\s\-()]{7,15}$/, 'Please provide a valid phone number'],
      default: null,
    },
    website: {
      type: String,
      trim: true,
      match: [/^https?:\/\/.+/, 'Website must start with http:// or https://'],
      default: null,
    },
    type: {
      type: String,
      enum: {
        values: ['university', 'college', 'institute', 'polytechnic', 'other'],
        message: 'Invalid college type',
      },
      default: 'college',
    },
    establishedYear: {
      type: Number,
      min: [1800, 'Established year seems too early'],
      max: [new Date().getFullYear(), 'Established year cannot be in the future'],
      default: null,
    },
    affiliatedTo: {
      type: String,
      trim: true,
      default: null,
    },

    // ── Media ──────────────────────────────────────────────────────
    logoUrl:   { type: String, default: null },
    bannerUrl: { type: String, default: null },

    // ── Details ────────────────────────────────────────────────────
    description: {
      type: String,
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
      default: null,
    },
    address:     { type: addressSchema,     default: () => ({}) },
    socialLinks: { type: socialLinksSchema, default: () => ({}) },

    // ── Verification workflow ──────────────────────────────────────
    // verificationStatus drives whether faculty can create events.
    // status is the lifecycle state (active / suspended).
    verificationStatus: {
      type: String,
      enum: {
        values: ['pending', 'verified', 'rejected'],
        message: 'Invalid verification status',
      },
      default: 'pending',
    },
    verifiedBy:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    verifiedAt:      { type: Date, default: null },
    verificationRejectionReason: { type: String, trim: true, default: null },

    // ── Lifecycle status ───────────────────────────────────────────
    status: {
      type: String,
      enum: {
        values: ['pending', 'approved', 'rejected', 'suspended'],
        message: 'Invalid college status',
      },
      default: 'pending',
    },
    rejectionReason: { type: String, default: null },
    suspensionReason:{ type: String, default: null },
    approvedBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    approvedAt:  { type: Date, default: null },
    reviewedAt:  { type: Date, default: null },

    // ── Pending edit request ──────────────────────────────────────
    pendingEdit: {
      name:            { type: String, default: null },
      email:           { type: String, default: null },
      phone:           { type: String, default: null },
      website:         { type: String, default: null },
      description:     { type: String, default: null },
      logoUrl:         { type: String, default: null },
      address:         { type: addressSchema, default: null },
      submittedAt:     { type: Date, default: null },
    },
    editStatus: {
      type: String,
      enum: ['none', 'pending', 'approved', 'rejected'],
      default: 'none',
    },
    editRejectionReason: { type: String, default: null },

    // ── Ownership ──────────────────────────────────────────────────
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'College must have a creator'],
    },

    // ── Stats (denormalized for performance) ───────────────────────
    totalEvents:   { type: Number, default: 0, min: 0 },
    totalStudents: { type: Number, default: 0, min: 0 },
  },
  {
    timestamps: true,
    toJSON:   { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ── Virtuals ───────────────────────────────────────────────────────

collegeSchema.virtual('isVerified').get(function () {
  return this.verificationStatus === 'verified';
});

// ── Indexes ────────────────────────────────────────────────────────

// Primary lookup by email — unique
collegeSchema.index({ email: 1 }, { unique: true });

// Admin approval queue — most common admin query
collegeSchema.index({ status: 1, createdAt: 1 });

// Verification queue
collegeSchema.index({ verificationStatus: 1, createdAt: 1 });

// Full-text search on name and description
collegeSchema.index({ name: 'text', description: 'text' });

// Lookup by name (exact / prefix)
collegeSchema.index({ name: 1 });

// Filter by type + status
collegeSchema.index({ type: 1, status: 1 });

module.exports = mongoose.model('College', collegeSchema);
