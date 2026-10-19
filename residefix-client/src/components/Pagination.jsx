/**
 * Previous / next pager with a "page X of Y" label.
 * Renders nothing when everything fits on one page.
 */
export default function Pagination({ page, pages, total, onChange }) {
  if (!pages || pages <= 1) return null;
  return (
    <nav className="pagination" aria-label="Pagination">
      <button type="button" className="ghost" disabled={page <= 1} onClick={() => onChange(page - 1)}>
        ← Previous
      </button>
      <span>
        Page {page} of {pages}
        {total !== undefined && <small> · {total} total</small>}
      </span>
      <button type="button" className="ghost" disabled={page >= pages} onClick={() => onChange(page + 1)}>
        Next →
      </button>
    </nav>
  );
}
