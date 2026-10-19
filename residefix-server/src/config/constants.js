/**
 * Shared enum values. The models, validators and seed script all import from
 * here so the allowed values can never drift apart.
 */
const ROLES = ['resident', 'manager', 'admin'];
const PROPERTY_TYPES = ['hostel', 'apartment', 'boarding-house'];
const CATEGORIES = [
  'plumbing',
  'electrical',
  'cleaning',
  'security',
  'internet',
  'noise',
  'furniture',
  'other',
];
const PRIORITIES = ['low', 'medium', 'high', 'urgent'];
const STATUSES = ['open', 'in-progress', 'resolved', 'closed'];

module.exports = { ROLES, PROPERTY_TYPES, CATEGORIES, PRIORITIES, STATUSES };
