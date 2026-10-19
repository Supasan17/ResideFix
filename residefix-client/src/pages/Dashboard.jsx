import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { complaintsApi, statsApi } from '../api/index.js';
import Loader from '../components/Loader.jsx';
import { EmptyState, ErrorMessage } from '../components/Feedback.jsx';
import ComplaintCard from '../components/ComplaintCard.jsx';
import { STATUSES, label } from '../utils/constants.js';
import { formatHours } from '../utils/format.js';

/** Greeting, stat tiles and quick links tailored to the user's role. */
const ROLE_INTRO = {
  resident: {
    text: 'Report problems in your accommodation and follow them until they are fixed.',
    actions: [
      { to: '/complaints/new', text: 'Report a problem', primary: true },
      { to: '/my-complaints', text: 'View my complaints' },
    ],
    recentTitle: 'Your latest complaints',
  },
  manager: {
    text: 'Complaints from the properties you manage and anything assigned to you.',
    actions: [
      { to: '/manage', text: 'Manage complaints', primary: true },
      { to: '/manage?assignedTo=unassigned', text: 'Unassigned' },
    ],
    recentTitle: 'Most urgent open work',
  },
  admin: {
    text: 'An overview of every property, complaint and user in ResideFix.',
    actions: [
      { to: '/admin', text: 'Open admin panel', primary: true },
      { to: '/manage', text: 'All complaints' },
    ],
    recentTitle: 'Most urgent open work',
  },
};

export default function Dashboard() {
  const { user } = useAuth();
  const intro = ROLE_INTRO[user.role];
  const [stats, setStats] = useState(null);
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // Residents see their newest complaints; staff see the highest-priority open ones.
      const listParams =
        user.role === 'resident'
          ? { limit: 3, sort: 'newest' }
          : { limit: 5, sort: 'priority', status: 'open' };
      const [s, list] = await Promise.all([statsApi.get(), complaintsApi.list(listParams)]);
      setStats(s.data);
      setRecent(list.data);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user.role]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <section>
      <div className="page-head">
        <div>
          <h1>Hello, {user.name.split(' ')[0]}</h1>
          <p className="hint">{intro.text}</p>
        </div>
        <div className="row start">
          {intro.actions.map((a) => (
            <Link key={a.to} to={a.to} className={a.primary ? 'btn' : 'ghost big'}>
              {a.text}
            </Link>
          ))}
        </div>
      </div>

      <ErrorMessage message={error} onRetry={load} />

      {loading ? (
        <Loader />
      ) : (
        stats && (
          <>
            <div className="tiles">
              <div className="tile">
                <strong>{stats.total}</strong>
                <span>Total complaints</span>
              </div>
              {STATUSES.map((s) => (
                <div key={s} className={`tile tile-${s}`}>
                  <strong>{stats.byStatus[s]}</strong>
                  <span>{label(s)}</span>
                </div>
              ))}
              <div className="tile">
                <strong>{formatHours(stats.avgResolutionHours)}</strong>
                <span>Avg. resolution time</span>
              </div>
            </div>

            <h2 className="section-title">{intro.recentTitle}</h2>
            {recent.length === 0 ? (
              user.role === 'resident' ? (
                <EmptyState
                  title="Nothing reported yet"
                  action={{ to: '/complaints/new', text: 'Report your first problem' }}
                >
                  When something breaks, report it here and track it to the end.
                </EmptyState>
              ) : (
                <EmptyState title="No open complaints">Everything is under control.</EmptyState>
              )
            ) : (
              recent.map((c) => (
                <ComplaintCard key={c._id} complaint={c} showResident={user.role !== 'resident'} />
              ))
            )}
          </>
        )
      )}
    </section>
  );
}
