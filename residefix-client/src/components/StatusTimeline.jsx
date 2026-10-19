import { StatusBadge } from './Badges.jsx';
import { formatDateTime } from '../utils/format.js';

/** Vertical timeline of every status change on a complaint, oldest first. */
export default function StatusTimeline({ history = [] }) {
  if (history.length === 0) return <p className="hint">No status changes yet.</p>;
  return (
    <ol className="timeline">
      {history.map((event, i) => (
        <li key={`${event.status}-${event.at}-${i}`} className={`t-${event.status}`}>
          <div className="row">
            <StatusBadge status={event.status} />
            <time dateTime={event.at}>{formatDateTime(event.at)}</time>
          </div>
          <p>
            {event.note || 'Status updated'}
            {event.changedBy && <span className="hint"> by {event.changedBy.name}</span>}
          </p>
        </li>
      ))}
    </ol>
  );
}
