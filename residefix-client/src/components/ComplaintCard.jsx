import { Link } from 'react-router-dom';
import { PriorityBadge, StatusBadge } from './Badges.jsx';
import { label } from '../utils/constants.js';
import { timeAgo } from '../utils/format.js';

/** Summary card used in complaint lists; the title links to the details page. */
export default function ComplaintCard({ complaint, showResident = false, children }) {
  const c = complaint;
  return (
    <article className={`card p-${c.priority}`}>
      <div className="row">
        <h3>
          <Link to={`/complaints/${c._id}`}>{c.title}</Link>
        </h3>
        <StatusBadge status={c.status} />
      </div>
      <p className="meta">
        {c.property?.name}
        {c.roomNumber && ` · room ${c.roomNumber}`} · {label(c.category)} · {timeAgo(c.createdAt)}
        {showResident && c.resident && ` · by ${c.resident.name}`}
      </p>
      <p className="clamp">{c.description}</p>
      <div className="row tags">
        <PriorityBadge priority={c.priority} />
        <span className="hint">
          {c.assignedTo ? `Assigned to ${c.assignedTo.name}` : 'Not assigned yet'}
        </span>
      </div>
      {children}
    </article>
  );
}
