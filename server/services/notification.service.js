const Notification = require('../models/Notification.model');
const logger       = require('../utils/logger');

// ── Primitives ─────────────────────────────────────────────────────

/**
 * Send a single notification. Non-throwing — logs on failure.
 */
const send = async (opts) => {
  try {
    await Notification.create(opts);
  } catch (err) {
    logger.error('[Notification] send failed', { error: err.message, type: opts.type });
  }
};

/**
 * Broadcast the same notification to many recipients at once.
 * @param {string[]} recipientIds  - Array of User ObjectIds
 * @param {Object}   opts          - Notification fields (without recipient)
 */
const broadcast = async (recipientIds, opts) => {
  if (!recipientIds?.length) return;
  try {
    const docs = recipientIds.map((recipient) => ({ ...opts, recipient }));
    await Notification.insertMany(docs, { ordered: false });
  } catch (err) {
    logger.error('[Notification] broadcast failed', { error: err.message, type: opts.type, count: recipientIds.length });
  }
};

// ── Typed factory functions ────────────────────────────────────────
// Each function maps to a specific platform event.
// Controllers call these instead of constructing raw objects.

// ── Student notifications ──────────────────────────────────────────

/**
 * Sent to a student when their registration is confirmed.
 */
const registrationConfirmed = (studentId, event) =>
  send({
    recipient:    studentId,
    type:         'registration_confirmed',
    title:        'Registration Confirmed',
    message:      `You're registered for "${event.title}" on ${_fmtDate(event.startDate)}.`,
    relatedEvent: event._id,
    actionUrl:    `/events/${event._id}`,
    priority:     'high',
  });

/**
 * Sent to a student when they are placed on the waitlist.
 */
const addedToWaitlist = (studentId, event) =>
  send({
    recipient:    studentId,
    type:         'event_updated',
    title:        'Added to Waitlist',
    message:      `You're on the waitlist for "${event.title}". We'll notify you if a seat opens.`,
    relatedEvent: event._id,
    actionUrl:    `/events/${event._id}`,
    priority:     'normal',
  });

/**
 * Sent to a waitlisted student when they are promoted to confirmed.
 */
const waitlistPromoted = (studentId, event) =>
  send({
    recipient:    studentId,
    type:         'registration_confirmed',
    title:        "Seat Available — You're In!",
    message:      `A seat opened for "${event.title}". Your registration is now confirmed.`,
    relatedEvent: event._id,
    actionUrl:    `/events/${event._id}`,
    priority:     'high',
  });

/**
 * Sent to a student when their registration is cancelled by faculty/admin.
 */
const registrationCancelledByOrganiser = (studentId, event, reason) =>
  send({
    recipient:    studentId,
    type:         'registration_cancelled',
    title:        'Registration Cancelled',
    message:      `Your registration for "${event.title}" was cancelled.${reason ? ' Reason: ' + reason : ''}`,
    relatedEvent: event._id,
    actionUrl:    `/events/${event._id}`,
    priority:     'high',
  });

/**
 * Sent to all confirmed registrants when an event is updated.
 */
const eventUpdatedForRegistrants = (recipientIds, event) =>
  broadcast(recipientIds, {
    type:         'event_updated',
    title:        'Event Updated',
    message:      `"${event.title}" has been updated. Check the latest details.`,
    relatedEvent: event._id,
    actionUrl:    `/events/${event._id}`,
    priority:     'normal',
  });

/**
 * Sent to all students of a college when a new event is published.
 */
const newEventPublished = (recipientIds, event) =>
  broadcast(recipientIds, {
    type:         'event_published',
    title:        'New Event: ' + event.title,
    message:      `A new ${event.type} event has been published. Registration closes ${_fmtDate(event.registrationDeadline)}.`,
    relatedEvent: event._id,
    actionUrl:    `/events/${event._id}`,
    priority:     'normal',
  });

/**
 * Sent to registrants when registration deadline is approaching (24h reminder).
 */
const deadlineReminder = (recipientIds, event) =>
  broadcast(recipientIds, {
    type:         'event_reminder',
    title:        'Event Tomorrow: ' + event.title,
    message:      `"${event.title}" starts tomorrow at ${_fmtDate(event.startDate)}. Don't forget!`,
    relatedEvent: event._id,
    actionUrl:    `/events/${event._id}`,
    priority:     'high',
  });

/**
 * Sent to students whose waitlist registrations are cancelled when registration closes.
 */
const waitlistCancelledOnClose = (recipientIds, event) =>
  broadcast(recipientIds, {
    type:         'registration_cancelled',
    title:        'Registration Closed',
    message:      `Registration for "${event.title}" has closed. No seat was available for you.`,
    relatedEvent: event._id,
    actionUrl:    `/events/${event._id}`,
    priority:     'normal',
  });

/**
 * Sent to all registrants when an event is cancelled.
 */
const eventCancelled = (recipientIds, event) =>
  broadcast(recipientIds, {
    type:         'event_cancelled',
    title:        'Event Cancelled',
    message:      `"${event.title}" has been cancelled by the organiser.`,
    relatedEvent: event._id,
    actionUrl:    `/events/${event._id}`,
    priority:     'urgent',
  });

// ── Faculty notifications ──────────────────────────────────────────

/**
 * Sent to the event creator (faculty) when a student registers.
 */
const studentRegistered = (facultyId, event, student) =>
  send({
    recipient:    facultyId,
    type:         'registration_confirmed',
    title:        'New Registration',
    message:      `${student.name} registered for "${event.title}". Total: ${event.registeredCount}/${event.totalSeats}.`,
    relatedEvent: event._id,
    actionUrl:    `/events/${event._id}/registrations`,
    priority:     'low',
  });

/**
 * Sent to faculty when their event is approved by superadmin.
 */
const eventApproved = (facultyId, event) =>
  send({
    recipient:    facultyId,
    type:         'event_updated',
    title:        'Event Approved',
    message:      `Your event "${event.title}" has been approved and is now visible to students.`,
    relatedEvent: event._id,
    actionUrl:    `/events/${event._id}`,
    priority:     'high',
  });

/**
 * Sent to faculty when their event is rejected by superadmin.
 */
const eventRejected = (facultyId, event, reason) =>
  send({
    recipient:    facultyId,
    type:         'event_updated',
    title:        'Event Rejected',
    message:      `Your event "${event.title}" was rejected.${reason ? ' Reason: ' + reason : ''}`,
    relatedEvent: event._id,
    actionUrl:    `/events/${event._id}`,
    priority:     'urgent',
  });

/**
 * Sent to faculty when their event is flagged by superadmin.
 */
const eventFlaggedForFaculty = (facultyId, event, note) =>
  send({
    recipient:    facultyId,
    type:         'event_updated',
    title:        'Event Flagged for Review',
    message:      `Your event "${event.title}" has been flagged.${note ? ' Note: ' + note : ''}`,
    relatedEvent: event._id,
    actionUrl:    `/events/${event._id}`,
    priority:     'urgent',
  });

/**
 * Sent to faculty when their event is restored after being flagged.
 */
const eventRestoredForFaculty = (facultyId, event) =>
  send({
    recipient:    facultyId,
    type:         'event_updated',
    title:        'Event Restored',
    message:      `Your event "${event.title}" has been reviewed and restored to published status.`,
    relatedEvent: event._id,
    actionUrl:    `/events/${event._id}`,
    priority:     'high',
  });

// ── Super Admin notifications ──────────────────────────────────────

/**
 * Sent to all superadmins when a faculty creates a new event awaiting approval.
 */
const newEventPendingApproval = (adminIds, event) =>
  broadcast(adminIds, {
    type:         'announcement',
    title:        'New Event Pending Approval',
    message:      `"${event.title}" has been submitted by faculty and requires your review.`,
    relatedEvent: event._id,
    actionUrl:    `/admin/events`,
    priority:     'high',
  });

/**
 * Sent to all superadmins when a new college registers.
 */
const newCollegeRegistered = (adminIds, college) =>
  broadcast(adminIds, {
    type:         'announcement',
    title:        'New College Registration',
    message:      `"${college.name}" has submitted a registration request and is pending approval.`,
    relatedCollege: college._id,
    actionUrl:    `/admin/colleges/${college._id}`,
    priority:     'high',
  });

/**
 * Sent to all superadmins when an event is flagged (moderation alert).
 */
const eventFlaggedForAdmin = (adminIds, event, flaggedBy) =>
  broadcast(adminIds, {
    type:         'announcement',
    title:        'Event Flagged',
    message:      `Event "${event.title}" was flagged by ${flaggedBy.name} for review.`,
    relatedEvent: event._id,
    actionUrl:    `/admin/events/${event._id}`,
    priority:     'urgent',
  });

// ── College approval notifications (to faculty) ───────────────────

const collegeApproved = (facultyId, college) =>
  send({
    recipient:      facultyId,
    type:           'college_approved',
    title:          'College Approved',
    message:        `Your college "${college.name}" has been approved. You can now create events.`,
    relatedCollege: college._id,
    actionUrl:      '/events/create',
    priority:       'high',
  });

const collegeRejected = (facultyId, college, reason) =>
  send({
    recipient:      facultyId,
    type:           'college_rejected',
    title:          'College Application Rejected',
    message:        `Your college "${college.name}" was rejected.${reason ? ' Reason: ' + reason : ''}`,
    relatedCollege: college._id,
    priority:       'high',
  });

const collegeEditApproved = (facultyId, college) =>
  send({
    recipient:      facultyId,
    type:           'college_approved',
    title:          'College Edit Approved',
    message:        `Your edit request for "${college.name}" has been approved and is now live.`,
    relatedCollege: college._id,
    actionUrl:      '/college',
    priority:       'high',
  });

const collegeEditRejected = (facultyId, college, reason) =>
  send({
    recipient:      facultyId,
    type:           'college_rejected',
    title:          'College Edit Rejected',
    message:        `Your edit request for "${college.name}" was rejected. Reason: ${reason}`,
    relatedCollege: college._id,
    actionUrl:      '/college',
    priority:       'high',
  });

const newCollegeEditPending = (adminIds, college) =>
  broadcast(adminIds, {
    type:           'announcement',
    title:          'College Edit Pending Approval',
    message:        `"${college.name}" has submitted an edit request that requires your review.`,
    relatedCollege: college._id,
    actionUrl:      '/colleges',
    priority:       'high',
  });

const collegeSuspended = (facultyId, college, reason) =>
  send({
    recipient:      facultyId,
    type:           'college_suspended',
    title:          'College Suspended',
    message:        `Your college "${college.name}" has been suspended.${reason ? ' Reason: ' + reason : ''}`,
    relatedCollege: college._id,
    priority:       'urgent',
  });

// ── Account notifications ──────────────────────────────────────────

const accountSuspended = (userId, reason) =>
  send({
    recipient: userId,
    type:      'account_suspended',
    title:     'Account Suspended',
    message:   `Your account has been suspended.${reason ? ' Reason: ' + reason : ''}`,
    priority:  'urgent',
  });

const accountReactivated = (userId) =>
  send({
    recipient: userId,
    type:      'account_reactivated',
    title:     'Account Reactivated',
    message:   'Your account has been reactivated. You can now log in.',
    priority:  'high',
  });

// ── College announcement broadcast ────────────────────────────────

/**
 * Faculty sends a college-wide announcement to all students of their college.
 */
const collegeAnnouncement = (studentIds, title, message, sentBy) =>
  broadcast(studentIds, {
    type:     'announcement',
    title,
    message,
    sentBy,
    priority: 'normal',
  });

// ── Internal helper ────────────────────────────────────────────────

const _fmtDate = (d) => {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
};

module.exports = {
  // primitives
  send,
  broadcast,
  // student
  registrationConfirmed,
  addedToWaitlist,
  waitlistPromoted,
  registrationCancelledByOrganiser,
  eventUpdatedForRegistrants,
  newEventPublished,
  deadlineReminder,
  waitlistCancelledOnClose,
  eventCancelled,
  // faculty
  studentRegistered,
  eventApproved,
  eventRejected,
  eventFlaggedForFaculty,
  eventRestoredForFaculty,
  // superadmin
  newCollegeRegistered,
  newEventPendingApproval,
  eventFlaggedForAdmin,
  // college status
  collegeApproved,
  collegeRejected,
  collegeEditApproved,
  collegeEditRejected,
  newCollegeEditPending,
  collegeSuspended,
  // account
  accountSuspended,
  accountReactivated,
  // announcement
  collegeAnnouncement,
};
