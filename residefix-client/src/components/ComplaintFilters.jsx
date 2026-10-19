import { CATEGORIES, PRIORITIES, STATUSES, label } from '../utils/constants.js';

/**
 * Search box plus status / category / priority / sort dropdowns.
 * Controlled: the parent owns `filters` and receives every change.
 * Optional `extra` renders more controls (e.g. property or assignee filters).
 */
export default function ComplaintFilters({ filters, onChange, extra }) {
  const set = (key) => (e) => onChange({ ...filters, [key]: e.target.value, page: 1 });

  return (
    <div className="filters" role="search">
      <label className="grow">
        <span className="sr-only">Search complaints</span>
        <input
          type="search"
          placeholder="Search title, description or room"
          value={filters.q}
          onChange={set('q')}
        />
      </label>
      <label>
        <span className="sr-only">Status</span>
        <select value={filters.status} onChange={set('status')}>
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {label(s)}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span className="sr-only">Category</span>
        <select value={filters.category} onChange={set('category')}>
          <option value="">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {label(c)}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span className="sr-only">Priority</span>
        <select value={filters.priority} onChange={set('priority')}>
          <option value="">All priorities</option>
          {PRIORITIES.map((p) => (
            <option key={p} value={p}>
              {label(p)}
            </option>
          ))}
        </select>
      </label>
      {extra}
      <label>
        <span className="sr-only">Sort</span>
        <select value={filters.sort} onChange={set('sort')}>
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="updated">Recently updated</option>
          <option value="priority">Highest priority</option>
        </select>
      </label>
    </div>
  );
}
