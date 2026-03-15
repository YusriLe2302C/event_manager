const User = require('../models/User.model');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const path = require('path');
const fs = require('fs');

const getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id)
      .select('-refreshToken');
    if (!user) throw ApiError.notFound('User not found');
    ApiResponse.success(res, 'Profile fetched', user);
  } catch (err) {
    next(err);
  }
};

const updateProfile = async (req, res, next) => {
  try {
    const allowed = ['name', 'bio', 'skills', 'designation', 'department'];
    const updates = {};
    allowed.forEach((f) => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });

    const user = await User.findByIdAndUpdate(req.user.id, updates, {
      new: true,
      runValidators: true,
    }).select('-refreshToken');

    ApiResponse.success(res, 'Profile updated', user);
  } catch (err) {
    next(err);
  }
};

const uploadResume = async (req, res, next) => {
  try {
    if (!req.file) throw ApiError.badRequest('Resume file required');

    const user = await User.findById(req.user.id).select('resumeUrl');

    // Delete old resume if exists
    if (user.resumeUrl) {
      const oldPath = path.join(__dirname, '..', user.resumeUrl);
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }

    const resumeUrl = `uploads/resumes/${req.file.filename}`;
    await User.findByIdAndUpdate(req.user.id, { resumeUrl });
    ApiResponse.success(res, 'Resume uploaded', { resumeUrl });
  } catch (err) {
    next(err);
  }
};

const toggleBookmark = async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const user = await User.findById(req.user.id).select('bookmarks');
    const idx = user.bookmarks.indexOf(eventId);
    if (idx === -1) {
      user.bookmarks.push(eventId);
    } else {
      user.bookmarks.splice(idx, 1);
    }
    await user.save();
    ApiResponse.success(res, idx === -1 ? 'Bookmarked' : 'Bookmark removed', {
      bookmarked: idx === -1,
    });
  } catch (err) {
    next(err);
  }
};

const getBookmarks = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id)
      .select('bookmarks')
      .populate({
        path: 'bookmarks',
        select: 'title type startDate college bannerImage status',
        populate: { path: 'college', select: 'name' },
      });
    ApiResponse.success(res, 'Bookmarks fetched', user.bookmarks);
  } catch (err) {
    next(err);
  }
};

module.exports = { getProfile, updateProfile, uploadResume, toggleBookmark, getBookmarks };
