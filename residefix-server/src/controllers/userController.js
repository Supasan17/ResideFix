const User = require('../models/User');
const Property = require('../models/Property');
const Complaint = require('../models/Complaint');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { ok } = require('../utils/respond');
const { getPagination, escapeRegex } = require('../utils/pagination');

/** GET /api/users (admin) - ?role, ?q (name/email search), ?page, ?limit */
const listUsers = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.role) filter.role = req.query.role;
  if (req.query.q && req.query.q.trim()) {
    const rx = new RegExp(escapeRegex(req.query.q.trim()), 'i');
    filter.$or = [{ name: rx }, { email: rx }];
  }

  const { skip, limit, meta } = getPagination(req.query, { defaultLimit: 20 });
  const [users, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).populate('property', 'name type'),
    User.countDocuments(filter),
  ]);
  ok(res, users, { meta: meta(total) });
});

/** GET /api/users/staff (manager/admin) - people a complaint can be assigned to. */
const listStaff = asyncHandler(async (_req, res) => {
  const staff = await User.find({ role: { $in: ['manager', 'admin'] } })
    .select('name email role')
    .sort({ name: 1 });
  ok(res, staff);
});

/** GET /api/users/:id (admin) */
const getUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).populate('property', 'name type address');
  if (!user) throw ApiError.notFound('User not found');
  ok(res, user);
});

/** PATCH/PUT /api/users/:id (admin) - edit profile fields and role. */
const updateUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw ApiError.notFound('User not found');

  const { name, phone, roomNumber, role, property } = req.body;
  if (role !== undefined && String(user._id) === String(req.user._id) && role !== 'admin') {
    throw ApiError.badRequest('You cannot remove your own admin role');
  }
  if (property) {
    if (!(await Property.exists({ _id: property }))) throw ApiError.badRequest('Property not found');
  }

  if (name !== undefined) user.name = name;
  if (phone !== undefined) user.phone = phone;
  if (roomNumber !== undefined) user.roomNumber = roomNumber;
  if (role !== undefined) user.role = role;
  if (property !== undefined) user.property = property || null;

  await user.save();
  ok(res, await user.populate('property', 'name type'), { message: 'User updated' });
});

/**
 * DELETE /api/users/:id (admin)
 * Their complaints are kept for the record; properties they managed and
 * complaints assigned to them are released.
 */
const deleteUser = asyncHandler(async (req, res) => {
  if (String(req.params.id) === String(req.user._id)) {
    throw ApiError.badRequest('You cannot delete your own account');
  }
  const user = await User.findById(req.params.id);
  if (!user) throw ApiError.notFound('User not found');

  await Promise.all([
    Property.updateMany({ manager: user._id }, { $set: { manager: null } }),
    Complaint.updateMany({ assignedTo: user._id }, { $set: { assignedTo: null } }),
  ]);
  await user.deleteOne();
  ok(res, { id: user._id }, { message: 'User deleted' });
});

module.exports = { listUsers, listStaff, getUser, updateUser, deleteUser };
