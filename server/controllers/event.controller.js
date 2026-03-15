const path = require('path');
const fs   = require('fs');
const Event        = require('../models/Event.model');
const User         = require('../models/User.model');
const Registration = require('../models/Registration.model');
const ApiError     = require('../utils/ApiError');
const ApiResponse  = require('../utils/ApiResponse');
const { clearCache }  = require('../middleware/cache.middleware');
const { UPLOAD_ROOT } = require('../middleware/upload.middleware');
const notif           = require('../services/notification.service');
const analytics       = require('../services/analytics.service');
const fm              = require('../services/fileManager.service');

// ── Helpers ────────────────────────────────────────────────────────

const BASE_URL = () =>
  process.env.BASE_URL || `http://localhost:${process.env.PORT || 5000}`;

// Convert stored relative path → full public URL
const toUrl = (relativePath) =>
  relativePath ? `${BASE_URL()}/${relativePath}` : null;

// Build a relative path from a multer file object
const toRelative = (file, folder) =>
  file ? `uploads/${folder}/${file.filename}` : undefined;

// Attach full URLs to an event document before sending to client
const withFileUrls = (event) => {
  const obj = event.toObject ? event.toObject() : { ...event };
  const fields = ['bannerImage', 'posterImage', 'brochurePdf', 'rulebookPdf'];
  fields.forEach((f) => { obj[f] = toUrl(obj[f]); });
  obj.workshopMaterials = (obj.workshopMaterials || []).map(toUrl);
  return obj;
};

// Ownership guard — delegates to fileManager for full college+creator check
const assertOwner = (event, user, collegeId) =>
  fm.assertOwnership(event, user, collegeId);

// Shared log context for file operations
const fileCtx = (req, event) => ({
  userId:  req.user.id,
  eventId: event._id.toString(),
  route:   req.originalUrl,
});

// ── Controllers ────────────────────────────────────────────────────

const createEvent = async (req, res, next) => {
  try {
    const {
      title, description, type, startDate, endDate,
      registrationDeadline, venue, isOnline, meetLink,
      totalSeats, isFree, fee, tags,
    } = req.body;

    // req.files is populated by uploadEventDocuments (fields upload)
    const files = req.files || {};
    const single = (fieldName, folder) => {
      const arr = files[fieldName];
      return arr?.[0] ? toRelative(arr[0], folder) : undefined;
    };

    const event = await Event.create({
      title, description, type, startDate, endDate,
      registrationDeadline, venue, isOnline, meetLink,
      totalSeats, isFree, fee,
      tags: tags ? (Array.isArray(tags) ? tags : tags.split(',').map((t) => t.trim())) : [],
      bannerImage:  single('bannerImage', 'event-banners'),
      posterImage:  single('posterImage', 'event-banners'),
      brochurePdf:  single('brochurePdf', 'event-documents'),
      rulebookPdf:  single('rulebookPdf', 'event-documents'),
      college:   req.collegeId,
      createdBy: req.user.id,
      status: 'pending',
    });

    clearCache('/api/events');

    // Notify superadmins that a new event awaits approval
    const admins = await User.find({ role: 'superadmin', isActive: true }, '_id').lean();
    if (admins.length) {
      await notif.newEventPendingApproval(admins.map((a) => a._id), event);
    }

    ApiResponse.created(res, 'Event created successfully', withFileUrls(event));
  } catch (err) {
    next(err);
  }
};

const getEvents = async (req, res, next) => {
  try {
    const {
      page = 1, limit = 20, type, college, isFree,
      search, status, sortBy = 'startDate',
    } = req.query;

    // Students always see only approved events — hard-locked
    const filter = {};
    if (!req.user || req.user.role === 'student') {
      filter.status = 'approved';
    } else if (req.user.role === 'faculty') {
      // resolve college from DB — req.collegeId not set on this route
      const facultyUser = await User.findById(req.user.id).select('college').lean();
      if (facultyUser?.college) filter.college = facultyUser.college;
      if (status) filter.status = status;
      // ?myEvents=true — show only events created by this faculty member
      if (req.query.myEvents === 'true') filter.createdBy = req.user.id;
    } else {
      if (status) filter.status = status;
    }

    if (type)   filter.type  = type;
    if (college && req.user?.role !== 'faculty') filter.college = college;
    if (isFree !== undefined) filter.isFree = isFree === 'true';
    if (search) filter.$text = { $search: search };

    const skip = (page - 1) * limit;
    const sortOrder = sortBy === 'startDate' ? { startDate: 1 } : { createdAt: -1 };

    const [events, total] = await Promise.all([
      Event.find(filter)
        .populate('college', 'name logoUrl')
        .select('-moderationNote')
        .sort(sortOrder)
        .skip(skip)
        .limit(Number(limit)),
      Event.countDocuments(filter),
    ]);

    ApiResponse.paginated(
      res,
      'Events fetched',
      events.map(withFileUrls),
      { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / limit) }
    );
  } catch (err) {
    next(err);
  }
};

const getEventById = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate('college',   'name logoUrl website')
      .populate('createdBy', 'name designation');
    if (!event) throw ApiError.notFound('Event not found');
    if (event.status !== 'approved' && req.user?.role === 'student')
      throw ApiError.notFound('Event not found');
    // Increment view count fire-and-forget — never block the response
    Event.findByIdAndUpdate(req.params.id, { $inc: { viewCount: 1 } }).exec();
    ApiResponse.success(res, 'Event fetched', withFileUrls(event));
  } catch (err) {
    next(err);
  }
};

const updateEvent = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) throw ApiError.notFound('Event not found');
    assertOwner(event, req.user, req.collegeId);

    const textFields = [
      'title', 'description', 'startDate', 'endDate',
      'registrationDeadline', 'venue', 'isOnline', 'meetLink',
      'totalSeats', 'isFree', 'fee', 'tags', 'status',
    ];
    textFields.forEach((f) => { if (req.body[f] !== undefined) event[f] = req.body[f]; });

    // Handle optional file replacements atomically via fileManager
    const files = req.files || {};
    const ctx   = fileCtx(req, event);

    // For each field: if a new file was uploaded, stage it on the document.
    // atomicReplace is called per-field only when a new file is present.
    // We batch the text-field save first, then handle file replacements.
    await event.save();

    // After text save succeeds, atomically replace any uploaded files
    for (const [field, folder] of [
      ['bannerImage', 'event-banners'],
      ['posterImage', 'event-banners'],
      ['brochurePdf', 'event-documents'],
      ['rulebookPdf', 'event-documents'],
    ]) {
      const arr = files[field];
      if (arr?.[0]) {
        const oldPath = event[field];
        event[field]  = toRelative(arr[0], folder);
        // Save the new path — if this fails, clean up the new upload
        try {
          await event.save();
          if (oldPath) fm.safeDelete(oldPath, UPLOAD_ROOT, { ...ctx, reason: 'replaced_via_update' });
        } catch (saveErr) {
          fm.safeDelete(event[field], UPLOAD_ROOT, { ...ctx, reason: 'db_save_failed' });
          event[field] = oldPath;
          throw saveErr;
        }
      }
    }
    clearCache('/api/events');

    // Notify confirmed/waitlisted registrants about the update
    const regs = await Registration.find(
      { event: event._id, status: { $in: ['confirmed', 'waitlisted'] } },
      'student'
    ).lean();
    if (regs.length) {
      await notif.eventUpdatedForRegistrants(regs.map((r) => r.student), event);
    }

    ApiResponse.success(res, 'Event updated', withFileUrls(event));
  } catch (err) {
    next(err);
  }
};

// POST /api/events/:id/upload-banner
const uploadBannerToEvent = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id).select('createdBy college bannerImage');
    if (!event) throw ApiError.notFound('Event not found');
    assertOwner(event, req.user, req.collegeId);
    if (!req.file) throw ApiError.badRequest('Banner image file required');

    await fm.atomicReplace({
      event, field: 'bannerImage', multerFile: req.file,
      uploadRoot: UPLOAD_ROOT, toRelative,
      context: fileCtx(req, event),
    });

    clearCache('/api/events');
    ApiResponse.success(res, 'Banner uploaded', { bannerImage: toUrl(event.bannerImage) });
  } catch (err) {
    next(err);
  }
};

// POST /api/events/:id/upload-documents
const uploadDocumentsToEvent = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) throw ApiError.notFound('Event not found');
    assertOwner(event, req.user, req.collegeId);

    const files = req.files || {};
    const ctx   = fileCtx(req, event);

    // Atomically replace each single-file field that has a new upload
    for (const [field, folder] of [
      ['bannerImage', 'event-banners'],
      ['posterImage', 'event-banners'],
      ['brochurePdf', 'event-documents'],
      ['rulebookPdf', 'event-documents'],
    ]) {
      const arr = files[field];
      if (arr?.[0]) {
        await fm.atomicReplace({
          event, field, multerFile: arr[0],
          uploadRoot: UPLOAD_ROOT, toRelative,
          context: ctx,
        });
      }
    }

    // Workshop materials — append new files, save once
    if (files.workshopMaterials?.length) {
      files.workshopMaterials.forEach((f) =>
        event.workshopMaterials.push(toRelative(f, 'event-documents'))
      );
      await event.save();
    }

    clearCache('/api/events');
    ApiResponse.success(res, 'Documents uploaded', withFileUrls(event));
  } catch (err) {
    next(err);
  }
};

// DELETE /api/events/:id/files
// Body: { field, index? }
const deleteEventFile = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) throw ApiError.notFound('Event not found');
    assertOwner(event, req.user, req.collegeId);

    const { field, index } = req.body;
    if (!fm.ALL_MANAGED_FIELDS.includes(field))
      throw ApiError.badRequest(
        `Invalid field. Must be one of: ${fm.ALL_MANAGED_FIELDS.join(', ')}`
      );

    const ctx = fileCtx(req, event);

    if (field === 'workshopMaterials') {
      await fm.deleteWorkshopMaterial({ event, index, uploadRoot: UPLOAD_ROOT, context: ctx });
    } else {
      await fm.deleteField({ event, field, uploadRoot: UPLOAD_ROOT, context: ctx });
    }

    clearCache('/api/events');
    ApiResponse.success(res, 'File deleted successfully');
  } catch (err) {
    next(err);
  }
};

// PATCH /api/events/:id/files/replace-workshop
// Body: { index: number }  +  multipart file field: workshopMaterials
const replaceWorkshopMaterial = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) throw ApiError.notFound('Event not found');
    assertOwner(event, req.user, req.collegeId);
    if (!req.file) throw ApiError.badRequest('Replacement file required');

    const ctx = fileCtx(req, event);
    await fm.replaceWorkshopMaterial({
      event,
      index:      req.body.index,
      multerFile: req.file,
      uploadRoot: UPLOAD_ROOT,
      toRelative,
      context:    ctx,
    });

    clearCache('/api/events');
    ApiResponse.success(res, 'Workshop material replaced', {
      workshopMaterials: event.workshopMaterials.map(toUrl),
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/events/:id/files
const getEventFiles = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id)
      .select('createdBy college bannerImage posterImage brochurePdf rulebookPdf workshopMaterials');
    if (!event) throw ApiError.notFound('Event not found');
    assertOwner(event, req.user, req.collegeId);

    ApiResponse.success(res, 'Event files fetched', fm.getFileManifest(event, toUrl));
  } catch (err) {
    next(err);
  }
};

const deleteEvent = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) throw ApiError.notFound('Event not found');
    assertOwner(event, req.user, req.collegeId);

    // Clean up all associated files via fileManager
    fm.deleteAllEventFiles(event, UPLOAD_ROOT, fileCtx(req, event));

    await event.deleteOne();
    clearCache('/api/events');
    ApiResponse.success(res, 'Event deleted');
  } catch (err) {
    next(err);
  }
};

// ── Search & filter ───────────────────────────────────────────────
//
// GET /api/events/search
// Supports: search, type, college, location, dateFrom, dateTo,
//           isOnline, isFree, tags, timeframe, sortBy, page, limit
//
// Cache key includes the full query string so each unique filter
// combination is cached independently for 120 seconds.

const searchEvents = async (req, res, next) => {
  try {
    const {
      search,
      type,
      college,
      location,
      dateFrom,
      dateTo,
      isOnline,
      isFree,
      tags,
      timeframe,
      sortBy    = 'startDate',
      page      = 1,
      limit     = 12,
    } = req.query;

    // ── Build filter ──────────────────────────────────────────────
    // searchEvents is student-facing — always locked to approved
    const filter = { status: 'approved' };

    // Full-text search (title × 10, tags × 5, description × 1)
    if (search?.trim()) {
      filter.$text = { $search: search.trim() };
    }

    // Exact-match filters
    if (type)     filter.type     = type;
    if (college)  filter.college  = college;
    if (isOnline !== undefined) filter.isOnline = isOnline === 'true';
    if (isFree   !== undefined) filter.isFree   = isFree   === 'true';

    // Location — case-insensitive prefix match so "bang" matches "bangalore"
    if (location?.trim()) {
      const escapedLocation = location.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.location = { $regex: `^${escapedLocation}`, $options: 'i' };
    }

    // Tags — comma-separated list, match events that have ALL supplied tags
    if (tags?.trim()) {
      const tagList = tags.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean);
      if (tagList.length) filter.tags = { $all: tagList };
    }

    // ── Date range ────────────────────────────────────────────────
    const now = new Date();

    if (timeframe) {
      switch (timeframe) {
        case 'upcoming':
          filter.startDate = { $gte: now };
          break;
        case 'past':
          filter.endDate = { $lt: now };
          break;
        case 'today': {
          const start = new Date(now); start.setHours(0, 0, 0, 0);
          const end   = new Date(now); end.setHours(23, 59, 59, 999);
          filter.startDate = { $gte: start, $lte: end };
          break;
        }
        case 'this_week': {
          const weekEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
          filter.startDate = { $gte: now, $lte: weekEnd };
          break;
        }
        case 'this_month': {
          const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
          filter.startDate = { $gte: now, $lte: monthEnd };
          break;
        }
      }
    } else {
      // Manual date range — can coexist with timeframe being absent
      if (dateFrom || dateTo) {
        filter.startDate = {};
        if (dateFrom) filter.startDate.$gte = new Date(dateFrom);
        if (dateTo)   filter.startDate.$lte = new Date(dateTo);
      }
    }

    // ── Sort ──────────────────────────────────────────────────────
    // When full-text search is active, 'relevance' sorts by text score.
    // Otherwise fall back to the requested field.
    let sort;
    const projection = {};

    if (sortBy === 'relevance' && filter.$text) {
      projection.score = { $meta: 'textScore' };
      sort = { score: { $meta: 'textScore' }, startDate: 1 };
    } else {
      const sortMap = {
        startDate:  { startDate: 1 },
        createdAt:  { createdAt: -1 },
        viewCount:  { viewCount: -1 },
      };
      sort = sortMap[sortBy] ?? { startDate: 1 };
    }

    // ── Pagination ────────────────────────────────────────────────
    const pageNum  = Math.max(1, Number(page));
    const limitNum = Math.min(50, Math.max(1, Number(limit)));
    const skip     = (pageNum - 1) * limitNum;

    // ── Execute ───────────────────────────────────────────────────
    const [events, total] = await Promise.all([
      Event.find(filter, projection)
        .populate('college', 'name logoUrl city')
        .select('-moderationNote -brochurePdf -rulebookPdf -workshopMaterials')
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Event.countDocuments(filter),
    ]);

    // Attach file URLs (lean() returns plain objects so toObject() not needed)
    const enriched = events.map((e) => ({
      ...e,
      bannerImage: toUrl(e.bannerImage),
      posterImage: toUrl(e.posterImage),
    }));

    // ── Build facets for frontend filter counts ───────────────────
    // Run in parallel with main query — gives the UI "X results" per type
    const facetPipeline = [
      { $match: { status: 'approved', ...(filter.$text ? { $text: filter.$text } : {}) } },
      {
        $facet: {
          byType: [
            { $group: { _id: '$type', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
          ],
          byOnline: [
            { $group: { _id: '$isOnline', count: { $sum: 1 } } },
          ],
          byFree: [
            { $group: { _id: '$isFree', count: { $sum: 1 } } },
          ],
        },
      },
    ];

    const [facetResult] = await Event.aggregate(facetPipeline);

    const facets = {
      types:  Object.fromEntries((facetResult?.byType  ?? []).map((f) => [f._id, f.count])),
      online: Object.fromEntries((facetResult?.byOnline ?? []).map((f) => [String(f._id), f.count])),
      free:   Object.fromEntries((facetResult?.byFree   ?? []).map((f) => [String(f._id), f.count])),
    };

    ApiResponse.paginated(res, 'Search results', enriched, {
      total,
      page:    pageNum,
      limit:   limitNum,
      pages:   Math.ceil(total / limitNum),
      hasMore: pageNum < Math.ceil(total / limitNum),
      facets,
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/events/:id/analytics
const getEventAnalytics = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id).select('createdBy status');
    if (!event) throw ApiError.notFound('Event not found');

    // Faculty can only view analytics for their own events
    if (req.user.role === 'faculty' && event.createdBy.toString() !== req.user.id)
      throw ApiError.forbidden('You do not own this event');

    const data = await analytics.getEventAnalytics(req.params.id);
    if (!data) throw ApiError.notFound('Analytics not available');

    ApiResponse.success(res, 'Event analytics fetched', data);
  } catch (err) {
    next(err);
  }
};

// GET /api/events/analytics/summary  (faculty dashboard)
const getFacultyAnalytics = async (req, res, next) => {
  try {
    const User = require('../models/User.model');
    const user = await User.findById(req.user.id).select('college');
    const data = await analytics.getFacultyAnalytics(req.user.id, user?.college);
    ApiResponse.success(res, 'Faculty analytics fetched', data);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createEvent,
  getEvents,
  getEventById,
  updateEvent,
  uploadBannerToEvent,
  uploadDocumentsToEvent,
  deleteEventFile,
  replaceWorkshopMaterial,
  getEventFiles,
  deleteEvent,
  searchEvents,
  getEventAnalytics,
  getFacultyAnalytics,
};
