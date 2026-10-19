import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { complaintsApi, propertiesApi, usersApi } from '../api/index.js';
import useComplaints from '../hooks/useComplaints.js';
import ComplaintFilters from '../components/ComplaintFilters.jsx';
import ComplaintCard from '../components/ComplaintCard.jsx';
import Pagination from '../components/Pagination.jsx';
import Loader from '../components/Loader.jsx';
import { EmptyState, ErrorMessage } from '../components/Feedback.jsx';
import { STATUSES, label } from '../utils/constants.js';

/**
 * Work queue for managers (their properties) and admins (everything):
 * filter the list, then change status or assign directly from each card.
 */
export default function ManagerView() {
  const { user } = useAuth();
  const toast = useToast();
  const [searchParams] = useSearchParams();
  const { filters, setFilters, items, meta, loading, error, reload, replace } = useComplaints({
    assignedTo: searchParams.get('assignedTo') || '',
    property: '',
  });
  const [properties, setProperties] = useState([]);
  const [staff, setStaff] = useState([]);
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    Promise.all([propertiesApi.mine(), usersApi.staff()])
      .then(([p, s]) => {
        setProperties(p.data);
        setStaff(s.data);
      })
      .catch((err) => toast.error(err.message));
  }, [toast]);

  /** Runs an update for one card and swaps in the returned complaint. */
  const act = async (id, request) => {
    setBusyId(id);
    try {
      const res = await request();
      replace(res.data);
      toast.success(res.message);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusyId(null);
    }
  };

  const setFilter = (key) => (e) => setFilters({ ...filters, [key]: e.target.value, page: 1 });

  const extraFilters = (
    <>
      <label>
        <span className="sr-only">Property</span>
        <select value={filters.property} onChange={setFilter('property')}>
          <option value="">{user.role === 'admin' ? 'All properties' : 'All my properties'}</option>
          {properties.map((p) => (
            <option key={p._id} value={p._id}>
              {p.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span className="sr-only">Assignment</span>
        <select value={filters.assignedTo} onChange={setFilter('assignedTo')}>
          <option value="">Anyone</option>
          <option value="me">Assigned to me</option>
          <option value="unassigned">Unassigned</option>
        </select>
      </label>
    </>
  );

  return (
    <section>
      <div className="page-head">
        <div>
          <h1>{user.role === 'admin' ? 'All complaints' : 'Manage complaints'}</h1>
          <p className="hint">
            {user.role === 'admin'
              ? 'Every complaint across all properties.'
              : `Complaints for ${properties.length} propert${properties.length === 1 ? 'y' : 'ies'} you manage, plus anything assigned to you.`}
          </p>
        </div>
      </div>

      <ComplaintFilters filters={filters} onChange={setFilters} extra={extraFilters} />
      <ErrorMessage message={error} onRetry={reload} />

      {loading && items.length === 0 ? (
        <Loader />
      ) : items.length === 0 ? (
        <EmptyState title="No complaints match">Change the filters to see more.</EmptyState>
      ) : (
        <div aria-busy={loading}>
          {items.map((c) => (
            <ComplaintCard key={c._id} complaint={c} showResident>
              <div className="row start quick-actions">
                <label className="inline">
                  Status
                  <select
                    value={c.status}
                    disabled={busyId === c._id}
                    onChange={(e) => act(c._id, () => complaintsApi.setStatus(c._id, e.target.value, ''))}
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {label(s)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="inline">
                  Assign
                  <select
                    value={c.assignedTo?._id || ''}
                    disabled={busyId === c._id}
                    onChange={(e) => act(c._id, () => complaintsApi.assign(c._id, e.target.value || null))}
                  >
                    <option value="">Nobody</option>
                    {staff.map((s) => (
                      <option key={s._id} value={s._id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </ComplaintCard>
          ))}
        </div>
      )}

      <Pagination page={meta.page} pages={meta.pages} total={meta.total} onChange={(page) => setFilters({ ...filters, page })} />
    </section>
  );
}
