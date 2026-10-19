const mongoose = require('mongoose');
const Complaint = require('../models/Complaint');
const Property = require('../models/Property');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { ok, created } = require('../utils/respond');
const { getPagination, escapeRegex } = require('../utils/pagination');
const { complaintScope, canView, canManage, isOwner } = require('../utils/access');

// Fields filled in when a complaint is returned to the client.
const POPULATE = [
  { path: 'resident', select: 'name email phone roomNumber' },
  { path: 'property', select: 'name type address manager' },
  { path: 'assignedTo', select: 'name email role' },
  { path: 'comments.author', select: 'name role' },
  { path: 'statusHistory.changedBy', select: 'name role' },
];

// List view only needs the summary, not the comments/timeline authors.
const LIST_POPULATE = POPULATE.slice(0, 3);

const SORTS = {
  newest: { createdAt: -1 },
  oldest: { createdAt: 1 },
  updated: { updatedAt: -1 },
};

// Fields residents and staff may edit through PUT/PATCH /complaints/:id.
const EDITABLE = ['title', 'description', 'category', 'priority', 'images', 'roomNumber'];

/** Loads a complaint and checks that the current user may see it. */
async function findVisible(user, id, populate = POPULATE) {
  const complaint = await Complaint.findById(id).populate(populate);
  if (!complaint || !(await canView(user, complaint))) {
    // 404 instead of 403 so users cannot probe for other people's complaints
    throw ApiError.notFound('Complaint not found');
  }
  return complaint;
}

const reload = (id) => Complaint.findById(id).populate(POPULATE);

/**
 * GET /api/complaints
 * Supports ?status, ?category, ?priority, ?property, ?assignedTo (me|unassigned|id),
 * ?q keyword search, ?sort (newest|oldest|updated|priority), ?page and ?limit.
 */
const listComplaints = asyncHandler(async (req, res) => {
  const { status, category, priority, property, assignedTo, q, sort = 'newest' } = req.query;
  const filter = { ...(await complaintScope(req.user)) };

  if (status) filter.status = status;
  if (category) filter.category = category;
  if (priority) filter.priority = priority;
  // Cast ids explicitly: the priority sort uses an aggregation, which skips Mongoose casting.
  if (property) filter.property = new mongoose.Types.ObjectId(property);
  if (assignedTo === 'me') filter.assignedTo = req.user._id;
  else if (assignedTo === 'unassigned') filter.assignedTo = null;
  else if (assignedTo) filter.assignedTo = new mongoose.Types.ObjectId(assignedTo);

  if (q && q.trim()) {
    const rx = new RegExp(escapeRegex(q.trim()), 'i');
    const search = { $or: [{ title: rx }, { description: rx }, { roomNumber: rx }] };
    // Combine with the role scope (which may itself use $or) using $and.
    filter.$and = [...(filter.$and || []), search];
  }

  const { skip, limit, meta } = getPagination(req.query);
  const total = await Complaint.countDocuments(filter);

  let items;
  if (sort === 'priority') {
    // Priority is a string enum, so rank it explicitly with an aggregation.
    const ids = await Complaint.aggregate([
      { $match: filter },
      {
        $addFields: {
          rank: {
            $indexOfArray: [['urgent', 'high', 'medium', 'low'], '$priority'],
          },
        },
      },
      { $sort: { rank: 1, createdAt: -1 } },
      { $skip: skip },
      { $limit: limit },
      { $project: { _id: 1 } },
    ]);
    const order = ids.map((d) => String(d._id));
    const docs = await Complaint.find({ _id: { $in: order } })
      .select('-comments -statusHistory')
      .populate(LIST_POPULATE);
    items = docs.sort((a, b) => order.indexOf(String(a._id)) - order.indexOf(String(b._id)));
  } else {
    items = await Complaint.find(filter)
      .select('-comments -statusHistory')
      .sort(SORTS[sort] || SORTS.newest)
      .skip(skip)
      .limit(limit)
      .populate(LIST_POPULATE);
  }

  ok(res, items, { meta: meta(total) });
});

/** GET /api/complaints/:id */
const getComplaint = asyncHandler(async (req, res) => {
  ok(res, await findVisible(req.user, req.params.id));
});

/**
 * POST /api/complaints
 * The complaint belongs to the logged-in user. The property defaults to the
 * one saved on their profile.
 */
const createComplaint = asyncHandler(async (req, res) => {
  const propertyId = req.body.property || req.user.property;
  if (!propertyId) {
    throw ApiError.badRequest('Choose a property (or set one on your profile) before submitting');
  }
  if (!(await Property.exists({ _id: propertyId }))) {
    throw ApiError.badRequest('Selected property does not exist');
  }

  const data = { resident: req.user._id, property: propertyId };
  EDITABLE.forEach((field) => {
    if (req.body[field] !== undefined) data[field] = req.body[field];
  });
  if (!data.roomNumber && req.user.roomNumber) data.roomNumber = req.user.roomNumber;

  const complaint = await Complaint.create(data);
  created(res, await reload(complaint._id), 'Complaint submitted');
});

/**
 * PUT/PATCH /api/complaints/:id
 * Residents may edit their own complaint while it is still open.
 * Managers/admins may edit any complaint they handle.
 */
const updateComplaint = asyncHandler(async (req, res) => {
  const complaint = await findVisible(req.user, req.params.id, []);
  const staff = await canManage(req.user, complaint);

  if (!staff) {
    if (!isOwner(req.user, complaint)) throw ApiError.forbidden();
    if (complaint.status !== 'open') {
      throw ApiError.badRequest('You can only edit a complaint while it is still open');
    }
  }

  EDITABLE.forEach((field) => {
    if (req.body[field] !== undefined) complaint[field] = req.body[field];
  });
  await complaint.save();
  ok(res, await reload(complaint._id), { message: 'Complaint updated' });
});

/**
 * DELETE /api/complaints/:id
 * Residents may withdraw their own open complaint; admins may delete any.
 */
const deleteComplaint = asyncHandler(async (req, res) => {
  const complaint = await findVisible(req.user, req.params.id, []);
  const allowed =
    req.user.role === 'admin' || (isOwner(req.user, complaint) && complaint.status === 'open');
  if (!allowed) {
    throw ApiError.forbidden('Only open complaints can be withdrawn by the resident');
  }
  await complaint.deleteOne();
  ok(res, { id: complaint._id }, { message: 'Complaint deleted' });
});

/** POST /api/complaints/:id/comments */
const addComment = asyncHandler(async (req, res) => {
  const complaint = await findVisible(req.user, req.params.id, []);
  complaint.comments.push({ author: req.user._id, text: req.body.text });
  await complaint.save();
  created(res, await reload(complaint._id), 'Comment added');
});

/**
 * PATCH /api/complaints/:id/status
 * Staff can move a complaint to any status. A resident may only close their
 * own complaint once it has been resolved (confirming the fix).
 */
const updateStatus = asyncHandler(async (req, res) => {
  const { status, note = '' } = req.body;
  const complaint = await findVisible(req.user, req.params.id, []);
  const staff = await canManage(req.user, complaint);

  if (!staff) {
    const residentClosing =
      isOwner(req.user, complaint) && complaint.status === 'resolved' && status === 'closed';
    if (!residentClosing) throw ApiError.forbidden('Only property staff can change the status');
  }
  if (complaint.status === status) {
    throw ApiError.badRequest(`Complaint is already ${status}`);
  }

  complaint.status = status;
  complaint.statusHistory.push({ status, changedBy: req.user._id, note });

  if (['resolved', 'closed'].includes(status)) {
    if (!complaint.resolvedAt) complaint.resolvedAt = new Date();
  } else {
    // Re-opened: the earlier resolution no longer counts.
    complaint.resolvedAt = null;
  }

  await complaint.save();
  ok(res, await reload(complaint._id), { message: `Status changed to ${status}` });
});

/**
 * PATCH /api/complaints/:id/assign
 * Assigns the complaint to a manager or admin (or clears it with null).
 * Assigning an open complaint moves it to "in-progress" automatically.
 */
const assignComplaint = asyncHandler(async (req, res) => {
  const complaint = await findVisible(req.user, req.params.id, []);
  if (!(await canManage(req.user, complaint))) throw ApiError.forbidden();

  const assigneeId = req.body.assignedTo || null;
  let assignee = null;
  if (assigneeId) {
    assignee = await User.findById(assigneeId);
    if (!assignee || !['manager', 'admin'].includes(assignee.role)) {
      throw ApiError.badRequest('Complaints can only be assigned to a manager or admin');
    }
  }

  complaint.assignedTo = assignee ? assignee._id : null;
  if (assignee && complaint.status === 'open') {
    complaint.status = 'in-progress';
    complaint.statusHistory.push({
      status: 'in-progress',
      changedBy: req.user._id,
      note: `Assigned to ${assignee.name}`,
    });
  }

  await complaint.save();
  ok(res, await reload(complaint._id), {
    message: assignee ? `Assigned to ${assignee.name}` : 'Assignment removed',
  });
});

module.exports = {
  listComplaints,
  getComplaint,
  createComplaint,
  updateComplaint,
  deleteComplaint,
  addComment,
  updateStatus,
  assignComplaint,
};
