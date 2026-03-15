const { Parser } = require('json2csv');
const Registration = require('../models/Registration.model');
const Event        = require('../models/Event.model');
const ApiError     = require('../utils/ApiError');
const ApiResponse  = require('../utils/ApiResponse');
const notificationService = require('../services/notification.service');

// ── Guards ─────────────────────────────────────────────────────────

const assertEventOwner = (event, user) => {
  if (user.role !== 'superadmin' && event.createdBy.toString() !== user.id)
    throw ApiError.forbidden('You do not own this event');
};

// ── Validation layer (called inside each handler) ──────────────────

const validateRegistrationWindow = (event) => {
  if (event.status === 'cancelled')
    throw ApiError.badRequest('This event has been cancelled');
  if (event.status === 'completed')
    throw ApiError.badRequest('This event has already ended');
  if (event.status === 'flagged')
    throw ApiError.badRequest('This event is under review');
  if (event.status !== 'approved')
    throw ApiError.badRequest('Event is not open for registration');
  if (new Date() > new Date(event.registrationDeadline))
    throw ApiError.badRequest('Registration deadline has passed');
  if (event.registeredCount >= event.totalSeats)
    throw ApiError.conflict('Event is fully booked');
};

// ── Student: check registration status for an event ───────────────

const checkRegistrationStatus = async (req, res, next) => {
  try {
    const reg = await Registration.findOne({
      event:   req.params.eventId,
      student: req.user.id,
    }).select('status registeredAt paymentStatus teamName');

    ApiResponse.success(res, 'Status fetched', {
      isRegistered: !!reg,
      registration: reg ?? null,
    });
  } catch (err) {
    next(err);
  }
};

// ── Student: register for event ────────────────────────────────────

const registerForEvent = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.eventId);
    if (!event) throw ApiError.notFound('Event not found');

    validateRegistrationWindow(event);

    // Team event validation
    const { teamName, teamMembers = [] } = req.body;
    if (event.isTeamEvent) {
      if (!teamName?.trim())
        throw ApiError.badRequest('Team name is required for this event');
      const totalSize = teamMembers.length + 1;
      if (totalSize < event.minTeamSize)
        throw ApiError.badRequest(`Minimum team size is ${event.minTeamSize}`);
      if (totalSize > event.maxTeamSize)
        throw ApiError.badRequest(`Maximum team size is ${event.maxTeamSize}`);
    }

    const seatsLeft = event.totalSeats - event.registeredCount;
    const status    = seatsLeft > 0 ? 'confirmed' : 'waitlisted';

    const registration = await Registration.create({
      event:              event._id,
      student:            req.user.id,
      status,
      isTeamRegistration: event.isTeamEvent,
      teamName:           event.isTeamEvent ? teamName : null,
      teamMembers:        event.isTeamEvent ? teamMembers : [],
      paymentStatus:      event.isFree ? 'not_required' : 'pending',
      paymentAmount:      event.isFree ? 0 : event.fee,
    });

    if (status === 'confirmed') {
      await Event.findByIdAndUpdate(event._id, { $inc: { registeredCount: 1 } });
    }

    if (status === 'confirmed') {
      await notificationService.registrationConfirmed(req.user.id, event);
    } else {
      await notificationService.addedToWaitlist(req.user.id, event);
    }
    await notificationService.studentRegistered(event.createdBy, event, req.user);

    ApiResponse.created(res, status === 'confirmed'
      ? 'Registered successfully'
      : 'Added to waitlist', registration);
  } catch (err) {
    if (err.code === 11000)
      return next(ApiError.conflict('You are already registered for this event'));
    next(err);
  }
};

// ── Student: cancel registration ───────────────────────────────────

const cancelRegistration = async (req, res, next) => {
  try {
    const reg = await Registration.findOne({
      event:   req.params.eventId,
      student: req.user.id,
    });

    if (!reg) throw ApiError.notFound('Registration not found');
    if (reg.status === 'cancelled')
      throw ApiError.badRequest('Registration is already cancelled');
    if (reg.status === 'attended')
      throw ApiError.badRequest('Cannot cancel after check-in');

    const wasConfirmed = reg.status === 'confirmed';

    reg.status             = 'cancelled';
    reg.cancelledAt        = new Date();
    reg.cancelledBy        = 'student';
    reg.cancellationReason = req.body.reason ?? null;
    await reg.save();

    if (wasConfirmed) {
      await Event.findByIdAndUpdate(
        req.params.eventId,
        { $inc: { registeredCount: -1 } }
      );

      // Promote first waitlisted student
      const waitlisted = await Registration.findOne({
        event:  req.params.eventId,
        status: 'waitlisted',
      }).sort({ registeredAt: 1 });

      if (waitlisted) {
        waitlisted.status = 'confirmed';
        await waitlisted.save();
        await Event.findByIdAndUpdate(
          req.params.eventId,
          { $inc: { registeredCount: 1 } }
        );
        const event = await Event.findById(req.params.eventId).select('title startDate');
        await notificationService.waitlistPromoted(waitlisted.student, event);
      }
    }

    ApiResponse.success(res, 'Registration cancelled successfully');
  } catch (err) {
    next(err);
  }
};

// ── Student: get my registrations ─────────────────────────────────

const getMyRegistrations = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const filter = { student: req.user.id };
    if (status) filter.status = status;

    const skip = (page - 1) * limit;
    const [registrations, total] = await Promise.all([
      Registration.find(filter)
        .populate({
          path:   'event',
          select: 'title type startDate endDate college bannerImage status registrationDeadline venue isOnline isFree fee',
          populate: { path: 'college', select: 'name' },
        })
        .sort({ registeredAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Registration.countDocuments(filter),
    ]);

    ApiResponse.paginated(res, 'Registrations fetched', registrations, {
      total, page: Number(page), limit: Number(limit),
      pages: Math.ceil(total / limit),
    });
  } catch (err) {
    next(err);
  }
};

// ── Faculty: get all registrations for an event ────────────────────

const getEventRegistrations = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.eventId)
      .select('createdBy title totalSeats registeredCount status registrationDeadline');
    if (!event) throw ApiError.notFound('Event not found');
    assertEventOwner(event, req.user);

    const { status, search, page = 1, limit = 50 } = req.query;
    const filter = { event: req.params.eventId };
    if (status) filter.status = status;

    const skip = (page - 1) * limit;
    let query = Registration.find(filter)
      .populate('student', 'name email phone rollNumber branch year college resumeUrl skills')
      .sort({ registeredAt: 1 })
      .skip(skip)
      .limit(Number(limit));

    const [registrations, total] = await Promise.all([
      query,
      Registration.countDocuments(filter),
    ]);

    // Apply search filter in memory (name/email) — avoids extra index
    const results = search
      ? registrations.filter((r) => {
          const s = search.toLowerCase();
          return (
            r.student?.name?.toLowerCase().includes(s) ||
            r.student?.email?.toLowerCase().includes(s)
          );
        })
      : registrations;

    ApiResponse.paginated(res, 'Registrations fetched', results, {
      total,
      page:     Number(page),
      limit:    Number(limit),
      pages:    Math.ceil(total / limit),
      eventMeta: {
        title:          event.title,
        totalSeats:     event.totalSeats,
        registeredCount:event.registeredCount,
        seatsLeft:      event.totalSeats - event.registeredCount,
        status:         event.status,
        deadline:       event.registrationDeadline,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ── Faculty: close registration early ─────────────────────────────

const closeRegistration = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.eventId);
    if (!event) throw ApiError.notFound('Event not found');
    assertEventOwner(event, req.user);

    if (event.status !== 'approved')
      throw ApiError.badRequest('Only approved events can be closed');

    // Set deadline to now — this is the canonical way to close registration
    // without cancelling the event itself
    event.registrationDeadline = new Date();
    await event.save();

    // Notify all waitlisted students that they won't get a seat
    const waitlisted = await Registration.find({
      event:  event._id,
      status: 'waitlisted',
    }).select('student');

    if (waitlisted.length > 0) {
      await notificationService.waitlistCancelledOnClose(
        waitlisted.map((r) => r.student),
        event
      );
      // Cancel all waitlisted registrations
      await Registration.updateMany(
        { event: event._id, status: 'waitlisted' },
        { status: 'cancelled', cancelledAt: new Date(), cancelledBy: 'faculty' }
      );
    }

    ApiResponse.success(res, 'Registration closed', {
      registrationDeadline: event.registrationDeadline,
    });
  } catch (err) {
    next(err);
  }
};

// ── Faculty: check in an attendee ─────────────────────────────────

const checkInAttendee = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.eventId).select('createdBy title');
    if (!event) throw ApiError.notFound('Event not found');
    assertEventOwner(event, req.user);

    const reg = await Registration.findOne({
      _id:    req.params.registrationId,
      event:  req.params.eventId,
      status: 'confirmed',
    });
    if (!reg) throw ApiError.notFound('Confirmed registration not found');
    if (reg.checkedIn) throw ApiError.conflict('Already checked in');

    reg.checkedIn   = true;
    reg.checkedInAt = new Date();
    reg.status      = 'attended';
    await reg.save();

    ApiResponse.success(res, 'Checked in successfully', {
      checkedInAt: reg.checkedInAt,
    });
  } catch (err) {
    next(err);
  }
};

// ── Faculty: export attendees as CSV ──────────────────────────────

const exportAttendees = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.eventId).select('createdBy title');
    if (!event) throw ApiError.notFound('Event not found');
    assertEventOwner(event, req.user);

    const registrations = await Registration.find({
      event:  req.params.eventId,
      status: { $in: ['confirmed', 'attended'] },
    }).populate('student', 'name email phone rollNumber branch year');

    const rows = registrations.map((r, i) => ({
      'S.No':          i + 1,
      'Name':          r.student?.name ?? '',
      'Email':         r.student?.email ?? '',
      'Phone':         r.student?.phone ?? '',
      'Roll Number':   r.student?.rollNumber ?? '',
      'Branch':        r.student?.branch ?? '',
      'Year':          r.student?.year ?? '',
      'Team Name':     r.teamName ?? '',
      'Status':        r.status,
      'Checked In':    r.checkedIn ? 'Yes' : 'No',
      'Registered At': new Date(r.registeredAt).toLocaleString('en-IN'),
    }));

    const parser = new Parser();
    const csv    = parser.parse(rows);

    const filename = `${event.title.replace(/[^a-z0-9]/gi, '_')}_attendees.csv`;
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  } catch (err) {
    next(err);
  }
};

// ── Faculty: update seat limit ─────────────────────────────────────

const updateSeatLimit = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.eventId);
    if (!event) throw ApiError.notFound('Event not found');
    assertEventOwner(event, req.user);

    const { totalSeats } = req.body;
    if (!Number.isInteger(totalSeats) || totalSeats < 1)
      throw ApiError.badRequest('totalSeats must be a positive integer');
    if (totalSeats < event.registeredCount)
      throw ApiError.badRequest(
        `Cannot set seats below current registrations (${event.registeredCount})`
      );

    event.totalSeats = totalSeats;
    await event.save();

    // If new seats opened up, promote waitlisted students in bulk
    const newSeats = totalSeats - event.registeredCount;
    let promoted = 0;
    if (newSeats > 0) {
      const waitlisted = await Registration.find({
        event:  event._id,
        status: 'waitlisted',
      })
        .sort({ registeredAt: 1 })
        .limit(newSeats)
        .select('_id student');

      if (waitlisted.length) {
        promoted = waitlisted.length;
        const ids = waitlisted.map((r) => r._id);
        await Registration.updateMany({ _id: { $in: ids } }, { $set: { status: 'confirmed' } });
        await Event.findByIdAndUpdate(event._id, { $inc: { registeredCount: promoted } });
        await Promise.all(
          waitlisted.map((r) => notificationService.waitlistPromoted(r.student, event))
        );
      }
    }

    ApiResponse.success(res, 'Seat limit updated', {
      totalSeats: event.totalSeats,
      promoted,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  checkRegistrationStatus,
  registerForEvent,
  cancelRegistration,
  getMyRegistrations,
  getEventRegistrations,
  closeRegistration,
  checkInAttendee,
  exportAttendees,
  updateSeatLimit,
};
