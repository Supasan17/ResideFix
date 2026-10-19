const Property = require('../models/Property');
const User = require('../models/User');
const Complaint = require('../models/Complaint');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { ok, created } = require('../utils/respond');

const MANAGER_FIELDS = 'name email phone';

/** Throws unless the id belongs to a manager or admin account. */
async function assertManager(managerId) {
  if (!managerId) return;
  const user = await User.findById(managerId);
  if (!user || !['manager', 'admin'].includes(user.role)) {
    throw ApiError.badRequest('Property manager must be a manager or admin account');
  }
}

/**
 * GET /api/properties
 * Public so the sign-up form can list properties. ?mine=true returns only
 * properties managed by the logged-in manager (used by the manager view).
 */
const listProperties = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.type) filter.type = req.query.type;
  const properties = await Property.find(filter).sort({ name: 1 }).populate('manager', MANAGER_FIELDS);
  ok(res, properties);
});

/** GET /api/properties/mine - properties the current manager runs (all for admins). */
const myProperties = asyncHandler(async (req, res) => {
  const filter = req.user.role === 'admin' ? {} : { manager: req.user._id };
  const properties = await Property.find(filter).sort({ name: 1 }).populate('manager', MANAGER_FIELDS);
  ok(res, properties);
});

/** GET /api/properties/:id */
const getProperty = asyncHandler(async (req, res) => {
  const property = await Property.findById(req.params.id).populate('manager', MANAGER_FIELDS);
  if (!property) throw ApiError.notFound('Property not found');
  ok(res, property);
});

/** POST /api/properties (admin) */
const createProperty = asyncHandler(async (req, res) => {
  const { name, type, address, manager } = req.body;
  await assertManager(manager);
  const property = await Property.create({ name, type, address, manager: manager || null });
  created(res, await property.populate('manager', MANAGER_FIELDS), 'Property created');
});

/**
 * PUT/PATCH /api/properties/:id
 * Admins can edit any property. A manager can edit the details of a property
 * they manage but cannot hand it to someone else.
 */
const updateProperty = asyncHandler(async (req, res) => {
  const property = await Property.findById(req.params.id);
  if (!property) throw ApiError.notFound('Property not found');

  const isAdmin = req.user.role === 'admin';
  if (!isAdmin && String(property.manager) !== String(req.user._id)) {
    throw ApiError.forbidden('You can only edit properties you manage');
  }

  ['name', 'type', 'address'].forEach((field) => {
    if (req.body[field] !== undefined) property[field] = req.body[field];
  });
  if (req.body.manager !== undefined) {
    if (!isAdmin) throw ApiError.forbidden('Only an admin can change the property manager');
    await assertManager(req.body.manager);
    property.manager = req.body.manager || null;
  }

  await property.save();
  ok(res, await property.populate('manager', MANAGER_FIELDS), { message: 'Property updated' });
});

/**
 * DELETE /api/properties/:id (admin)
 * Refused while complaints still reference the property, so history is never orphaned.
 */
const deleteProperty = asyncHandler(async (req, res) => {
  const property = await Property.findById(req.params.id);
  if (!property) throw ApiError.notFound('Property not found');

  const complaintCount = await Complaint.countDocuments({ property: property._id });
  if (complaintCount > 0) {
    throw ApiError.conflict(
      `This property has ${complaintCount} complaint(s). Remove them before deleting the property.`
    );
  }

  await User.updateMany({ property: property._id }, { $set: { property: null } });
  await property.deleteOne();
  ok(res, { id: property._id }, { message: 'Property deleted' });
});

module.exports = {
  listProperties,
  myProperties,
  getProperty,
  createProperty,
  updateProperty,
  deleteProperty,
};
