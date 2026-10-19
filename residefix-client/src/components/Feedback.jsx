/**
 * Small presentational components for the loading / error / empty states
 * that every data-driven page needs.
 */
import { Link } from 'react-router-dom';

export function ErrorMessage({ message, onRetry }) {
  if (!message) return null;
  return (
    <div className="error" role="alert">
      <span>{message}</span>
      {onRetry && (
        <button type="button" className="ghost" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}

export function EmptyState({ title, children, action }) {
  return (
    <div className="empty">
      <p className="empty-title">{title}</p>
      {children && <p>{children}</p>}
      {action && (
        <Link className="btn" to={action.to}>
          {action.text}
        </Link>
      )}
    </div>
  );
}
