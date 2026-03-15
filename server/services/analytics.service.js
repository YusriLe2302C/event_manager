'use strict';

const mongoose     = require('mongoose');
const User         = require('../models/User.model');
const Event        = require('../models/Event.model');
const College      = require('../models/College.model');
const Registration = require('../models/Registration.model');
const cache        = require('../config/cache');

const { Types: { ObjectId } } = mongoose;

// ── Helpers ────────────────────────────────────────────────────────

const ttl = (seconds) => seconds;

// Build daily-bucket date range for trend queries
const dailyBuckets = (days) => {
  const now   = new Date();
  const start = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  return { start, now };
};

// ── 1. Platform stats (Super Admin overview) ───────────────────────

const getPlatformStats = async () => {
  const KEY = 'analytics:platform';
  const hit = cache.get(KEY);
  if (hit) return hit;

  const [
    totalUsers,
    usersByRole,
    totalColleges,
    collegesByVerification,
    totalEvents,
    eventsByStatus,
    eventsByType,
    totalRegistrations,
    registrationsLast30Days,
    registrationsLast7Days,
  ] = await Promise.all([
    User.countDocuments({ isActive: true }),
    User.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$role', count: { $sum: 1 } } },
    ]),
    College.countDocuments(),
    College.aggregate([
      { $group: { _id: '$verificationStatus', count: { $sum: 1 } } },
    ]),
    Event.countDocuments(),
    Event.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    Event.aggregate([
      { $group: { _id: '$type', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    Registration.countDocuments({ status: { $in: ['confirmed', 'attended'] } }),
    Registration.countDocuments({
      status: { $in: ['confirmed', 'attended'] },
      registeredAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
    }),
    Registration.countDocuments({
      status: { $in: ['confirmed', 'attended'] },
      registeredAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
    }),
  ]);

  const result = {
    users: {
      total:  totalUsers,
      byRole: Object.fromEntries(usersByRole.map((r) => [r._id, r.count])),
    },
    colleges: {
      total:              totalColleges,
      byVerificationStatus: Object.fromEntries(
        collegesByVerification.map((r) => [r._id, r.count])
      ),
    },
    events: {
      total:    totalEvents,
      byStatus: Object.fromEntries(eventsByStatus.map((r) => [r._id, r.count])),
      byType:   eventsByType,
    },
    registrations: {
      total:      totalRegistrations,
      last30Days: registrationsLast30Days,
      last7Days:  registrationsLast7Days,
    },
    generatedAt: new Date(),
  };

  cache.set(KEY, result, ttl(300));
  return result;
};

// ── 2. Most active colleges (by event count + registrations) ───────

const getMostActiveColleges = async ({ limit = 10 } = {}) => {
  const KEY = `analytics:active_colleges:${limit}`;
  const hit = cache.get(KEY);
  if (hit) return hit;

  const result = await Event.aggregate([
    { $match: { status: 'approved' } },
    {
      $group: {
        _id:              '$college',
        totalEvents:      { $sum: 1 },
        totalSeats:       { $sum: '$totalSeats' },
        totalRegistered:  { $sum: '$registeredCount' },
        avgFillRate: {
          $avg: {
            $cond: [
              { $gt: ['$totalSeats', 0] },
              { $divide: ['$registeredCount', '$totalSeats'] },
              0,
            ],
          },
        },
      },
    },
    { $sort: { totalRegistered: -1 } },
    { $limit: limit },
    {
      $lookup: {
        from:         'colleges',
        localField:   '_id',
        foreignField: '_id',
        as:           'college',
      },
    },
    { $unwind: '$college' },
    {
      $project: {
        _id:             0,
        collegeId:       '$_id',
        name:            '$college.name',
        logoUrl:         '$college.logoUrl',
        city:            '$college.address.city',
        totalEvents:     1,
        totalRegistered: 1,
        avgFillRate:     { $round: [{ $multiply: ['$avgFillRate', 100] }, 1] },
      },
    },
  ]);

  cache.set(KEY, result, ttl(300));
  return result;
};

// ── 3. Most popular events (by registrations + view count) ─────────

const getMostPopularEvents = async ({ limit = 10 } = {}) => {
  const KEY = `analytics:popular_events:${limit}`;
  const hit = cache.get(KEY);
  if (hit) return hit;

  const result = await Event.aggregate([
    { $match: { status: 'approved' } },
    {
      $addFields: {
        fillRate: {
          $cond: [
            { $gt: ['$totalSeats', 0] },
            { $round: [{ $multiply: [{ $divide: ['$registeredCount', '$totalSeats'] }, 100] }, 1] },
            0,
          ],
        },
        popularityScore: {
          $add: [
            { $multiply: ['$registeredCount', 3] },
            '$viewCount',
          ],
        },
      },
    },
    { $sort: { popularityScore: -1 } },
    { $limit: limit },
    {
      $lookup: {
        from:         'colleges',
        localField:   'college',
        foreignField: '_id',
        as:           'collegeInfo',
      },
    },
    { $unwind: { path: '$collegeInfo', preserveNullAndEmptyArrays: true } },
    {
      $project: {
        title:           1,
        type:            1,
        startDate:       1,
        registeredCount: 1,
        totalSeats:      1,
        viewCount:       1,
        fillRate:        1,
        popularityScore: 1,
        college:         '$collegeInfo.name',
      },
    },
  ]);

  cache.set(KEY, result, ttl(300));
  return result;
};

// ── 4. Registration trend (daily buckets, last N days) ─────────────

const getRegistrationTrend = async ({ days = 30, collegeId, eventId } = {}) => {
  const KEY = `analytics:reg_trend:${days}:${collegeId ?? 'all'}:${eventId ?? 'all'}`;
  const hit = cache.get(KEY);
  if (hit) return hit;

  const { start } = dailyBuckets(days);
  const match = {
    status:       { $in: ['confirmed', 'attended'] },
    registeredAt: { $gte: start },
  };

  if (eventId) {
    match.event = new ObjectId(String(eventId));
  }

  // If filtering by college, first get event IDs for that college
  if (collegeId && !eventId) {
    const eventIds = await Event.find({ college: collegeId }, '_id').lean();
    match.event = { $in: eventIds.map((e) => e._id) };
  }

  const trend = await Registration.aggregate([
    { $match: match },
    {
      $group: {
        _id: {
          year:  { $year:  '$registeredAt' },
          month: { $month: '$registeredAt' },
          day:   { $dayOfMonth: '$registeredAt' },
        },
        count: { $sum: 1 },
      },
    },
    { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
    {
      $project: {
        _id:   0,
        date: {
          $dateToString: {
            format: '%Y-%m-%d',
            date: {
              $dateFromParts: {
                year: '$_id.year', month: '$_id.month', day: '$_id.day',
              },
            },
          },
        },
        count: 1,
      },
    },
  ]);

  cache.set(KEY, trend, ttl(180));
  return trend;
};

// ── 5. Per-event analytics (Faculty view) ─────────────────────────

const getEventAnalytics = async (eventId) => {
  const KEY = `analytics:event:${eventId}`;
  const hit = cache.get(KEY);
  if (hit) return hit;

  const [
    event,
    statusBreakdown,
    collegeParticipation,
    branchBreakdown,
    yearBreakdown,
    dailyTrend,
    checkInRate,
  ] = await Promise.all([
    Event.findById(eventId)
      .select('title type totalSeats registeredCount viewCount startDate status')
      .lean(),

    // Registrations by status
    Registration.aggregate([
      { $match: { event: new ObjectId(String(eventId)) } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),

    // College participation — which colleges are registrants from
    Registration.aggregate([
      {
        $match: {
          event:  new ObjectId(String(eventId)),
          status: { $in: ['confirmed', 'attended'] },
        },
      },
      {
        $lookup: {
          from:         'users',
          localField:   'student',
          foreignField: '_id',
          as:           'studentDoc',
        },
      },
      { $unwind: '$studentDoc' },
      {
        $group: {
          _id:   '$studentDoc.college',
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from:         'colleges',
          localField:   '_id',
          foreignField: '_id',
          as:           'collegeDoc',
        },
      },
      { $unwind: { path: '$collegeDoc', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id:        0,
          collegeId:  '$_id',
          name:       { $ifNull: ['$collegeDoc.name', 'Unknown'] },
          count:      1,
        },
      },
    ]),

    // Branch breakdown
    Registration.aggregate([
      {
        $match: {
          event:  new ObjectId(String(eventId)),
          status: { $in: ['confirmed', 'attended'] },
        },
      },
      {
        $lookup: {
          from: 'users', localField: 'student',
          foreignField: '_id', as: 'studentDoc',
        },
      },
      { $unwind: '$studentDoc' },
      {
        $group: {
          _id:   { $ifNull: ['$studentDoc.branch', 'Not specified'] },
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 8 },
      { $project: { _id: 0, branch: '$_id', count: 1 } },
    ]),

    // Year of study breakdown
    Registration.aggregate([
      {
        $match: {
          event:  new ObjectId(String(eventId)),
          status: { $in: ['confirmed', 'attended'] },
        },
      },
      {
        $lookup: {
          from: 'users', localField: 'student',
          foreignField: '_id', as: 'studentDoc',
        },
      },
      { $unwind: '$studentDoc' },
      {
        $group: {
          _id:   { $ifNull: ['$studentDoc.year', 0] },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          _id:   0,
          year:  { $cond: [{ $eq: ['$_id', 0] }, 'Unknown', { $concat: ['Year ', { $toString: '$_id' }] }] },
          count: 1,
        },
      },
    ]),

    // Daily registration trend for this event
    getRegistrationTrend({ days: 30, eventId }),

    // Check-in rate
    Registration.aggregate([
      {
        $match: {
          event:  new ObjectId(String(eventId)),
          status: { $in: ['confirmed', 'attended'] },
        },
      },
      {
        $group: {
          _id:          null,
          total:        { $sum: 1 },
          checkedIn:    { $sum: { $cond: ['$checkedIn', 1, 0] } },
        },
      },
    ]),
  ]);

  if (!event) return null;

  const statusMap    = Object.fromEntries(statusBreakdown.map((s) => [s._id, s.count]));
  const confirmed    = statusMap.confirmed  ?? 0;
  const attended     = statusMap.attended   ?? 0;
  const waitlisted   = statusMap.waitlisted ?? 0;
  const cancelled    = statusMap.cancelled  ?? 0;
  const checkedInRow = checkInRate[0] ?? { total: 0, checkedIn: 0 };

  const result = {
    event: {
      id:              eventId,
      title:           event.title,
      type:            event.type,
      status:          event.status,
      startDate:       event.startDate,
      totalSeats:      event.totalSeats,
      registeredCount: event.registeredCount,
      viewCount:       event.viewCount,
      fillRate:        event.totalSeats > 0
        ? Math.round((event.registeredCount / event.totalSeats) * 100)
        : 0,
    },
    registrations: {
      confirmed,
      attended,
      waitlisted,
      cancelled,
      total: confirmed + attended + waitlisted + cancelled,
    },
    checkIn: {
      total:      checkedInRow.total,
      checkedIn:  checkedInRow.checkedIn,
      rate:       checkedInRow.total > 0
        ? Math.round((checkedInRow.checkedIn / checkedInRow.total) * 100)
        : 0,
    },
    collegeParticipation,
    branchBreakdown,
    yearBreakdown,
    dailyTrend,
    generatedAt: new Date(),
  };

  cache.set(KEY, result, ttl(120));
  return result;
};

// ── 6. Faculty dashboard analytics (all events by this faculty) ────

const getFacultyAnalytics = async (facultyId, collegeId) => {
  const KEY = `analytics:faculty:${facultyId}`;
  const hit = cache.get(KEY);
  if (hit) return hit;

  const oid = new ObjectId(String(facultyId));

  const [
    eventSummary,
    topEvents,
    registrationTrend,
    statusBreakdown,
  ] = await Promise.all([
    // Aggregate totals across all faculty events
    Event.aggregate([
      { $match: { createdBy: oid } },
      {
        $group: {
          _id:             null,
          totalEvents:     { $sum: 1 },
          totalSeats:      { $sum: '$totalSeats' },
          totalRegistered: { $sum: '$registeredCount' },
          totalViews:      { $sum: '$viewCount' },
          approvedCount:   { $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] } },
          pendingCount:    { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
          rejectedCount:   { $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] } },
        },
      },
    ]),

    // Top 5 events by registrations
    Event.aggregate([
      { $match: { createdBy: oid, status: 'approved' } },
      { $sort: { registeredCount: -1 } },
      { $limit: 5 },
      {
        $project: {
          title:           1,
          type:            1,
          registeredCount: 1,
          totalSeats:      1,
          viewCount:       1,
          startDate:       1,
          fillRate: {
            $cond: [
              { $gt: ['$totalSeats', 0] },
              { $round: [{ $multiply: [{ $divide: ['$registeredCount', '$totalSeats'] }, 100] }, 1] },
              0,
            ],
          },
        },
      },
    ]),

    // 30-day registration trend for all faculty events
    getRegistrationTrend({ days: 30, collegeId }),

    // Registration status breakdown across all faculty events
    (async () => {
      const eventIds = await Event.find({ createdBy: oid }, '_id').lean();
      if (!eventIds.length) return [];
      return Registration.aggregate([
        { $match: { event: { $in: eventIds.map((e) => e._id) } } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]);
    })(),
  ]);

  const summary = eventSummary[0] ?? {
    totalEvents: 0, totalSeats: 0, totalRegistered: 0, totalViews: 0,
    approvedCount: 0, pendingCount: 0, rejectedCount: 0,
  };

  const result = {
    summary: {
      totalEvents:     summary.totalEvents,
      approvedEvents:  summary.approvedCount,
      pendingEvents:   summary.pendingCount,
      rejectedEvents:  summary.rejectedCount,
      totalSeats:      summary.totalSeats,
      totalRegistered: summary.totalRegistered,
      totalViews:      summary.totalViews,
      avgFillRate:     summary.totalSeats > 0
        ? Math.round((summary.totalRegistered / summary.totalSeats) * 100)
        : 0,
    },
    topEvents,
    registrationTrend,
    statusBreakdown: Object.fromEntries(
      statusBreakdown.map((s) => [s._id, s.count])
    ),
    generatedAt: new Date(),
  };

  cache.set(KEY, result, ttl(180));
  return result;
};

module.exports = {
  getPlatformStats,
  getMostActiveColleges,
  getMostPopularEvents,
  getRegistrationTrend,
  getEventAnalytics,
  getFacultyAnalytics,
};
