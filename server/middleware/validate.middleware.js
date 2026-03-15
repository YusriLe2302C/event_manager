const { body, param, query, validationResult } = require('express-validator');
const ApiError = require('../utils/ApiError');

// Run after validator chains — collects errors and throws
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return next(ApiError.badRequest('Validation failed', errors.array()));
  next();
};

const rules = {
  register: [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('password')
      .isLength({ min: 8 })
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage('Password must be 8+ chars with upper, lower, and digit'),
    body('role')
      .optional()
      .isIn(['student', 'faculty'])
      .withMessage('Role must be student or faculty'),
  ],

  login: [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty().withMessage('Password required'),
  ],

  createEvent: [
    body('title').trim().notEmpty().withMessage('Title required'),
    body('description').trim().notEmpty().withMessage('Description required'),
    body('type')
      .isIn(['hackathon', 'workshop', 'seminar', 'competition', 'webinar', 'other'])
      .withMessage('Invalid event type'),
    body('startDate').isISO8601().withMessage('Valid start date required'),
    body('endDate').isISO8601().withMessage('Valid end date required'),
    body('registrationDeadline').isISO8601(),
    body('totalSeats').isInt({ min: 1 }).withMessage('Seats must be at least 1'),
  ],

  createCollege: [
    body('name').trim().notEmpty().withMessage('College name required'),
    body('email').isEmail().normalizeEmail(),
    body('phone').optional().isMobilePhone(),
    body('website').optional().isURL(),
  ],

  paginationQuery: [
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  ],

  mongoId: (field) => [
    param(field).isMongoId().withMessage(`Invalid ${field}`),
  ],

  registerForEvent: [
    body('teamName')
      .optional()
      .trim()
      .isLength({ max: 100 })
      .withMessage('Team name cannot exceed 100 characters'),
    body('teamMembers')
      .optional()
      .isArray({ max: 10 })
      .withMessage('Team members must be an array of max 10'),
    body('teamMembers.*.name')
      .optional()
      .trim()
      .notEmpty()
      .withMessage('Each team member must have a name'),
    body('teamMembers.*.email')
      .optional()
      .isEmail()
      .normalizeEmail()
      .withMessage('Each team member must have a valid email'),
  ],

  updateSeatLimit: [
    body('totalSeats')
      .isInt({ min: 1 })
      .withMessage('totalSeats must be a positive integer'),
  ],

  rejectCollege: [
    body('reason')
      .trim()
      .notEmpty().withMessage('Rejection reason is required')
      .isLength({ max: 500 }).withMessage('Reason cannot exceed 500 characters'),
  ],

  rejectEvent: [
    body('reason')
      .trim()
      .notEmpty().withMessage('Rejection reason is required')
      .isLength({ max: 500 }).withMessage('Reason cannot exceed 500 characters'),
  ],

  searchEvents: [
    query('search')
      .optional()
      .trim()
      .isLength({ max: 200 })
      .withMessage('Search query too long'),
    query('type')
      .optional()
      .isIn(['hackathon', 'workshop', 'seminar', 'competition', 'webinar', 'other'])
      .withMessage('Invalid event type'),
    query('college')
      .optional()
      .isMongoId()
      .withMessage('Invalid college ID'),
    query('location')
      .optional()
      .trim()
      .isLength({ max: 100 })
      .withMessage('Location too long'),
    query('dateFrom')
      .optional()
      .isISO8601()
      .withMessage('dateFrom must be a valid ISO date'),
    query('dateTo')
      .optional()
      .isISO8601()
      .withMessage('dateTo must be a valid ISO date'),
    query('isOnline')
      .optional()
      .isIn(['true', 'false'])
      .withMessage('isOnline must be true or false'),
    query('isFree')
      .optional()
      .isIn(['true', 'false'])
      .withMessage('isFree must be true or false'),
    query('tags')
      .optional()
      .trim()
      .isLength({ max: 200 })
      .withMessage('Tags filter too long'),
    query('timeframe')
      .optional()
      .isIn(['upcoming', 'past', 'today', 'this_week', 'this_month'])
      .withMessage('Invalid timeframe'),
    query('sortBy')
      .optional()
      .isIn(['startDate', 'createdAt', 'viewCount', 'relevance'])
      .withMessage('Invalid sortBy'),
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 50 }).toInt(),
  ],
};

module.exports = { validate, rules };
