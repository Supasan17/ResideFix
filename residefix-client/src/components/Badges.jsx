import { label } from '../utils/constants.js';

/** Coloured pill showing a complaint status (open, in-progress, resolved, closed). */
export function StatusBadge({ status }) {
  return <span className={`tag s-${status}`}>{label(status)}</span>;
}

/** Pill showing complaint priority; urgent and high stand out. */
export function PriorityBadge({ priority }) {
  return <span className={`tag p-tag-${priority}`}>{label(priority)} priority</span>;
}
