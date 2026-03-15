const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// ── Sub-schemas ────────────────────────────────────────────────────

const socialLinksSchema = new mongoose.Schema(
  {
    linkedin: { type: String, trim: true, default: null },
    github:   { type: String, trim: true, default: null },
    portfolio:{ type: String, trim: true, default: null },
  },
  { _id: false }
);

// ── Main schema ────────────────────────────────────────────────────

const userSchema = new mongoose.Schema(
  {
    // ── Core identity ──────────────────────────────────────────────
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2,  'Name must be at least 2 characters'],
      maxlength: [100,'Name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      select: false,
    },
    phone: {
      type: String,
      trim: true,
      match: [/^\+?[\d\s\-()]{7,15}$/, 'Please provide a valid phone number'],
      default: null,
    },
    role: {
      type: String,
      enum: {
        values: ['student', 'faculty', 'superadmin'],
        message: 'Role must be student, faculty, or superadmin',
      },
      default: 'student',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isSuspended: {
      type: Boolean,
      default: false,
    },
    suspensionReason: {
      type: String,
      default: null,
    },

    // ── Profile ────────────────────────────────────────────────────
    avatarUrl: { type: String, default: null },
    bio: {
      type: String,
      maxlength: [500, 'Bio cannot exceed 500 characters'],
      default: null,
    },
    socialLinks: { type: socialLinksSchema, default: () => ({}) },

    // ── Student-specific ───────────────────────────────────────────
    college: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'College',
      default: null,
    },
    rollNumber: {
      type: String,
      trim: true,
      default: null,
    },
    year: {
      type: Number,
      min: [1, 'Year must be between 1 and 6'],
      max: [6, 'Year must be between 1 and 6'],
      default: null,
    },
    branch: { type: String, trim: true, default: null },
    resumeUrl: { type: String, default: null },
    skills: {
      type: [{ type: String, trim: true, maxlength: 50 }],
      default: [],
      validate: {
        validator: (arr) => arr.length <= 30,
        message: 'Cannot have more than 30 skills',
      },
    },
    bookmarks: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Event' }],
      default: [],
      validate: {
        validator: (arr) => arr.length <= 200,
        message: 'Cannot bookmark more than 200 events',
      },
    },

    // ── Faculty-specific ───────────────────────────────────────────
    designation: { type: String, trim: true, default: null },
    department:  { type: String, trim: true, default: null },
    employeeId:  { type: String, trim: true, default: null },

    // ── Auth ───────────────────────────────────────────────────────
    refreshToken: { type: String, select: false, default: null },
    lastLoginAt:  { type: Date, default: null },
    passwordChangedAt: { type: Date, default: null },

    // ── Brute-force protection ─────────────────────────────────────
    loginAttempts: { type: Number, default: 0, select: false },
    lockUntil:     { type: Date,   default: null, select: false },
  },
  {
    timestamps: true,
    toJSON:   { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ── Virtuals ───────────────────────────────────────────────────────

// True when a student has filled in the minimum required profile fields
userSchema.virtual('profileComplete').get(function () {
  if (this.role !== 'student') return null;
  return !!(this.bio && this.skills.length > 0 && this.resumeUrl && this.college);
});

// ── Hooks ──────────────────────────────────────────────────────────

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  this.passwordChangedAt = new Date();
  next();
});

// ── Instance methods ───────────────────────────────────────────────

userSchema.methods.comparePassword = function (plain) {
  return bcrypt.compare(plain, this.password);
};

// Returns true if JWT was issued before the last password change
userSchema.methods.passwordChangedAfter = function (jwtIssuedAt) {
  if (!this.passwordChangedAt) return false;
  return Math.floor(this.passwordChangedAt.getTime() / 1000) > jwtIssuedAt;
};

// ── Indexes ────────────────────────────────────────────────────────
// email — primary lookup, must be unique
userSchema.index({ email: 1 }, { unique: true });

// role + isActive — admin user-management queries
userSchema.index({ role: 1, isActive: 1 });

// college — fetch all students/faculty of a college
userSchema.index({ college: 1, role: 1 }, { sparse: true });

// lastLoginAt — analytics / inactive user reports
userSchema.index({ lastLoginAt: -1 }, { sparse: true });

module.exports = mongoose.model('User', userSchema);
