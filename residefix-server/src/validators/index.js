/**
 * express-validator rule sets for every route that accepts input.
 * Each array is used as route middleware followed by validate().
 */
const { body, param, query } = require('express-validator');
const {
  ROLES,
  PROPERTY_TYPES,
  CATEGORIES,
  PRIORITIES,
  STATUSES,
} = require('../config/constants');

const objectId = (field, location = body) =>
  location(field).isMongoId().withMessage(`${field} must be a valid id`);

const idParam = [param('id').isMongoId().withMessage('Invalid id')];

// ---------- Auth ----------
const register = [
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 80 }),
  body('email').trim().isEmail().withMessage('A valid email is required').toLowerCase(),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('phone').optional({ values: 'falsy' }).trim().isLength({ max: 30 }),
  body('roomNumber').optional({ values: 'falsy' }).trim().isLength({ max: 20 }),
  objectId('property').optional({ values: 'falsy' }),
  body('managerCode').optional({ values: 'falsy' }).isString(),
];

const login = [
  body('email').trim().isEmail().withMessage('A valid email is required').toLowerCase(),
  body('password').notEmpty().withMessage('Password is required'),
];

const updateMe = [
  body('name').optional().trim().notEmpty().withMessage('Name cannot be empty').isLength({ max: 80 }),
  body('phone').optional().trim().isLength({ max: 30 }),
  body('roomNumber').optional().trim().isLength({ max: 20 }),
  objectId('property').optional({ values: 'null' }),
  body('newPassword')
    .optional({ values: 'falsy' })
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters'),
  body('currentPassword')
    .if(body('newPassword').notEmpty())
    .notEmpty()
    .withMessage('Current password is required to set a new one'),
];

// ---------- Complaints ----------
const complaintFields = (required) => {
  const opt = (chain) => (required ? chain : chain.optional());
  return [
    opt(body('title')).trim().notEmpty().withMessage('Title is required').isLength({ max: 120 }),
    opt(body('description'))
      .trim()
      .notEmpty()
      .withMessage('Description is required')
      .isLength({ max: 2000 }),
    opt(body('category')).isIn(CATEGORIES).withMessage(`Category must be one of: ${CATEGORIES.join(', ')}`),
    body('priority')
      .optional()
      .isIn(PRIORITIES)
      .withMessage(`Priority must be one of: ${PRIORITIES.join(', ')}`),
    body('roomNumber').optional().trim().isLength({ max: 20 }),
    body('images').optional().isArray({ max: 5 }).withMessage('Up to 5 image URLs are allowed'),
    body('images.*').optional().isURL().withMessage('Each image must be a valid URL'),
  ];
};

const createComplaint = [...complaintFields(true), objectId('property').optional({ values: 'falsy' })];
const updateComplaint = [...idParam, ...complaintFields(false)];

const listComplaints = [
  query('status').optional({ values: 'falsy' }).isIn(STATUSES).withMessage('Invalid status filter'),
  query('category').optional({ values: 'falsy' }).isIn(CATEGORIES).withMessage('Invalid category filter'),
  query('priority').optional({ values: 'falsy' }).isIn(PRIORITIES).withMessage('Invalid priority filter'),
  query('property').optional({ values: 'falsy' }).isMongoId().withMessage('Invalid property filter'),
  query('assignedTo')
    .optional({ values: 'falsy' })
    .custom((v) => v === 'me' || v === 'unassigned' || /^[a-f\d]{24}$/i.test(v))
    .withMessage('Invalid assignedTo filter'),
  query('q').optional().trim().isLength({ max: 100 }),
  query('page').optional().isInt({ min: 1 }).withMessage('page must be a positive number'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit must be 1-100'),
  query('sort').optional().isIn(['newest', 'oldest', 'priority', 'updated']).withMessage('Invalid sort'),
];

const addComment = [
  ...idParam,
  body('text').trim().notEmpty().withMessage('Comment text is required').isLength({ max: 1000 }),
];

const updateStatus = [
  ...idParam,
  body('status').isIn(STATUSES).withMessage(`Status must be one of: ${STATUSES.join(', ')}`),
  body('note').optional().trim().isLength({ max: 300 }),
];

const assignComplaint = [
  ...idParam,
  body('assignedTo')
    .custom((v) => v === null || v === '' || /^[a-f\d]{24}$/i.test(v))
    .withMessage('assignedTo must be a user id or null'),
];

// ---------- Properties ----------
const propertyFields = (required) => {
  const opt = (chain) => (required ? chain : chain.optional());
  return [
    opt(body('name')).trim().notEmpty().withMessage('Property name is required').isLength({ max: 120 }),
    opt(body('type'))
      .isIn(PROPERTY_TYPES)
      .withMessage(`Type must be one of: ${PROPERTY_TYPES.join(', ')}`),
    opt(body('address')).trim().notEmpty().withMessage('Address is required').isLength({ max: 250 }),
    body('manager')
      .optional({ values: 'null' })
      .custom((v) => v === '' || /^[a-f\d]{24}$/i.test(v))
      .withMessage('manager must be a user id'),
  ];
};
const createProperty = propertyFields(true);
const updateProperty = [...idParam, ...propertyFields(false)];

// ---------- Users ----------
const listUsers = [
  query('role').optional({ values: 'falsy' }).isIn(ROLES).withMessage('Invalid role filter'),
  query('q').optional().trim().isLength({ max: 100 }),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
];

const updateUser = [
  ...idParam,
  body('name').optional().trim().notEmpty().isLength({ max: 80 }),
  body('phone').optional().trim().isLength({ max: 30 }),
  body('roomNumber').optional().trim().isLength({ max: 20 }),
  body('role').optional().isIn(ROLES).withMessage(`Role must be one of: ${ROLES.join(', ')}`),
  body('property')
    .optional({ values: 'null' })
    .custom((v) => v === '' || /^[a-f\d]{24}$/i.test(v))
    .withMessage('property must be a property id'),
];

module.exports = {
  idParam,
  register,
  login,
  updateMe,
  createComplaint,
  updateComplaint,
  listComplaints,
  addComment,
  updateStatus,
  assignComplaint,
  createProperty,
  updateProperty,
  listUsers,
  updateUser,
};
