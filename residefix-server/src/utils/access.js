/**
 * Rules for which complaints a user may see and manage.
 *
 *  - resident: only complaints they submitted
 *  - manager:  complaints for properties they manage, plus any assigned to them
 *  - admin:    everything
 */
const Property = require('../models/Property');

/** Ids of the properties a manager is responsible for. */
async function managedPropertyIds(user) {
  const props = await Property.find({ manager: user._id }).select('_id').lean();
  return props.map((p) => p._id);
}

/** MongoDB filter limiting complaint queries to what the user is allowed to see. */
async function complaintScope(user) {
  if (user.role === 'admin') return {};
  if (user.role === 'manager') {
    const ids = await managedPropertyIds(user);
    return { $or: [{ property: { $in: ids } }, { assignedTo: user._id }] };
  }
  return { resident: user._id };
}

const idOf = (ref) => String(ref?._id || ref || '');

/** True when the manager runs the complaint's property or it is assigned to them. */
async function managerHandles(user, complaint) {
  if (idOf(complaint.assignedTo) === String(user._id)) return true;
  return Boolean(await Property.exists({ _id: idOf(complaint.property), manager: user._id }));
}

async function canView(user, complaint) {
  if (user.role === 'admin') return true;
  if (user.role === 'manager') return managerHandles(user, complaint);
  return idOf(complaint.resident) === String(user._id);
}

/** Staff permission: change status, assign, edit any field. */
async function canManage(user, complaint) {
  if (user.role === 'admin') return true;
  if (user.role === 'manager') return managerHandles(user, complaint);
  return false;
}

const isOwner = (user, complaint) => idOf(complaint.resident) === String(user._id);

module.exports = { managedPropertyIds, complaintScope, canView, canManage, isOwner };
