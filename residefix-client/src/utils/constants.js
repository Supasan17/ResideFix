/** Enum values shared by forms, filters and badges (mirror the server constants). */
export const CATEGORIES = ['plumbing', 'electrical', 'cleaning', 'security', 'internet', 'noise', 'furniture', 'other'];
export const PRIORITIES = ['low', 'medium', 'high', 'urgent'];
export const STATUSES = ['open', 'in-progress', 'resolved', 'closed'];
export const ROLES = ['resident', 'manager', 'admin'];
export const PROPERTY_TYPES = [
  { value: 'hostel', label: 'Hostel' },
  { value: 'apartment', label: 'Apartment' },
  { value: 'boarding-house', label: 'Boarding house' },
];

/** "in-progress" -> "In progress", "boarding-house" -> "Boarding house" */
export const label = (value = '') => {
  const text = String(value).replace(/-/g, ' ');
  return text.charAt(0).toUpperCase() + text.slice(1);
};
