/**
 * jobs/deadlineReminder.job.js
 *
 * Runs every day at 09:00 AM.
 * Finds events starting within the next 24 hours and sends
 * reminder notifications to all confirmed registrants.
 */

const cron         = require('node-cron');
const Event        = require('../models/Event.model');
const Registration = require('../models/Registration.model');
const notif        = require('../services/notification.service');
const logger       = require('../utils/logger');

const runReminders = async () => {
  try {
    const now   = new Date();
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    // Events starting in the next 24 hours that are approved
    const events = await Event.find({
      status:    'approved',
      startDate: { $gte: now, $lte: in24h },
    }).select('_id title startDate').lean();

    if (!events.length) return;

    for (const event of events) {
      const regs = await Registration.find(
        { event: event._id, status: 'confirmed' },
        'student'
      ).lean();

      if (regs.length) {
        await notif.deadlineReminder(regs.map((r) => r.student), event);
      }
    }

    logger.info(`[DeadlineReminder] Sent reminders for ${events.length} event(s)`);
  } catch (err) {
    logger.error('[DeadlineReminder] Job failed', { error: err.message });
  }
};

/**
 * Registers the cron schedule. Call once from server.js after DB connects.
 */
const register = () => {
  cron.schedule('0 9 * * *', runReminders, { timezone: 'Asia/Kolkata' });
  logger.info('[DeadlineReminder] Cron registered — runs daily at 09:00 IST');
};

module.exports = { register, runReminders };
