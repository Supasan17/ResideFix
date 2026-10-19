import { Link } from 'react-router-dom';
import useComplaints from '../hooks/useComplaints.js';
import ComplaintFilters from '../components/ComplaintFilters.jsx';
import ComplaintCard from '../components/ComplaintCard.jsx';
import Pagination from '../components/Pagination.jsx';
import Loader from '../components/Loader.jsx';
import { EmptyState, ErrorMessage } from '../components/Feedback.jsx';

/** A resident's own complaints with search, filters and pagination. */
export default function MyComplaints() {
  const { filters, setFilters, items, meta, loading, error, reload } = useComplaints();
  const filtering = filters.q || filters.status || filters.category || filters.priority;

  return (
    <section>
      <div className="page-head">
        <h1>My complaints</h1>
        <Link to="/complaints/new" className="btn">
          Report a problem
        </Link>
      </div>

      <ComplaintFilters filters={filters} onChange={setFilters} />
      <ErrorMessage message={error} onRetry={reload} />

      {loading && items.length === 0 ? (
        <Loader />
      ) : items.length === 0 ? (
        filtering ? (
          <EmptyState title="No complaints match these filters">Try clearing the search or filters.</EmptyState>
        ) : (
          <EmptyState title="You have not reported anything yet" action={{ to: '/complaints/new', text: 'Report a problem' }} />
        )
      ) : (
        <div aria-busy={loading}>
          {items.map((c) => (
            <ComplaintCard key={c._id} complaint={c} />
          ))}
        </div>
      )}

      <Pagination page={meta.page} pages={meta.pages} total={meta.total} onChange={(page) => setFilters({ ...filters, page })} />
    </section>
  );
}
