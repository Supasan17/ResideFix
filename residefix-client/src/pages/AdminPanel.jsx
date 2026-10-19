import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { propertiesApi, statsApi, usersApi } from '../api/index.js';
import BarChart, { TrendChart } from '../components/BarChart.jsx';
import Loader from '../components/Loader.jsx';
import Pagination from '../components/Pagination.jsx';
import Field from '../components/Field.jsx';
import { EmptyState, ErrorMessage } from '../components/Feedback.jsx';
import { PROPERTY_TYPES, ROLES, label } from '../utils/constants.js';
import { formatDate, formatHours } from '../utils/format.js';
import { hasErrors, validateProperty } from '../utils/validators.js';

const STATUS_COLORS = {
  open: 'var(--red)',
  'in-progress': 'var(--amber)',
  resolved: 'var(--teal)',
  closed: 'var(--muted)',
};
const PRIORITY_COLORS = { low: 'var(--teal)', medium: 'var(--amber)', high: 'var(--red)', urgent: '#7a0f0f' };

// ---------------------------------------------------------------- Overview
function Overview() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    setError('');
    statsApi
      .get()
      .then((res) => setStats(res.data))
      .catch((err) => setError(err.message));
  }, []);

  useEffect(load, [load]);

  if (error) return <ErrorMessage message={error} onRetry={load} />;
  if (!stats) return <Loader />;

  return (
    <>
      <div className="tiles">
        <div className="tile">
          <strong>{stats.total}</strong>
          <span>Complaints</span>
        </div>
        <div className="tile">
          <strong>{stats.byStatus.open + stats.byStatus['in-progress']}</strong>
          <span>Still active</span>
        </div>
        <div className="tile">
          <strong>{formatHours(stats.avgResolutionHours)}</strong>
          <span>Avg. resolution ({stats.resolvedCount} resolved)</span>
        </div>
        <div className="tile">
          <strong>{stats.totals.users}</strong>
          <span>
            Users ({stats.totals.byRole.resident} residents, {stats.totals.byRole.manager} managers)
          </span>
        </div>
        <div className="tile">
          <strong>{stats.totals.properties}</strong>
          <span>Properties</span>
        </div>
      </div>
      <div className="charts">
        <BarChart title="Complaints by status" data={stats.byStatus} colors={STATUS_COLORS} />
        <BarChart title="Complaints by priority" data={stats.byPriority} colors={PRIORITY_COLORS} />
        <BarChart title="Complaints by category" data={stats.byCategory} />
        <TrendChart title="New complaints, last 14 days" series={stats.last14Days} />
      </div>
    </>
  );
}

// ---------------------------------------------------------------- Users
function Users({ properties }) {
  const { user: me } = useAuth();
  const toast = useToast();
  const [filters, setFilters] = useState({ q: '', role: '', page: 1, limit: 10 });
  const [users, setUsers] = useState([]);
  const [meta, setMeta] = useState({ page: 1, pages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await usersApi.list(filters);
      setUsers(res.data);
      setMeta(res.meta);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  const update = async (id, body) => {
    try {
      const res = await usersApi.update(id, body);
      setUsers((list) => list.map((u) => (u._id === id ? res.data : u)));
      toast.success(res.message);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const remove = async (u) => {
    if (!window.confirm(`Delete ${u.name}? Their complaints are kept.`)) return;
    try {
      await usersApi.remove(u._id);
      toast.success('User deleted');
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const set = (key) => (e) => setFilters({ ...filters, [key]: e.target.value, page: 1 });

  return (
    <>
      <div className="filters">
        <label className="grow">
          <span className="sr-only">Search users</span>
          <input type="search" placeholder="Search name or email" value={filters.q} onChange={set('q')} />
        </label>
        <label>
          <span className="sr-only">Role</span>
          <select value={filters.role} onChange={set('role')}>
            <option value="">All roles</option>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {label(r)}
              </option>
            ))}
          </select>
        </label>
      </div>
      <ErrorMessage message={error} onRetry={load} />
      {loading && users.length === 0 ? (
        <Loader />
      ) : users.length === 0 ? (
        <EmptyState title="No users found" />
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Role</th>
                <th>Property</th>
                <th>Joined</th>
                <th>
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u._id}>
                  <td>
                    <b>{u.name}</b>
                    <br />
                    <small className="hint">{u.email}</small>
                  </td>
                  <td>
                    <select
                      aria-label={`Role for ${u.name}`}
                      value={u.role}
                      disabled={u._id === me._id}
                      onChange={(e) => update(u._id, { role: e.target.value })}
                    >
                      {ROLES.map((r) => (
                        <option key={r} value={r}>
                          {label(r)}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <select
                      aria-label={`Property for ${u.name}`}
                      value={u.property?._id || ''}
                      onChange={(e) => update(u._id, { property: e.target.value || null })}
                    >
                      <option value="">None</option>
                      {properties.map((p) => (
                        <option key={p._id} value={p._id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>{formatDate(u.createdAt)}</td>
                  <td>
                    {u._id !== me._id && (
                      <button type="button" className="ghost danger" onClick={() => remove(u)}>
                        Delete
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pagination page={meta.page} pages={meta.pages} total={meta.total} onChange={(page) => setFilters({ ...filters, page })} />
    </>
  );
}

// ---------------------------------------------------------------- Properties
const EMPTY_PROPERTY = { name: '', type: 'hostel', address: '', manager: '' };

function Properties({ properties, reload }) {
  const toast = useToast();
  const [managers, setManagers] = useState([]);
  const [form, setForm] = useState(EMPTY_PROPERTY);
  const [editingId, setEditingId] = useState(null);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    usersApi
      .staff()
      .then((res) => setManagers(res.data))
      .catch(() => setManagers([]));
  }, []);

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const startEdit = (p) => {
    setEditingId(p._id);
    setForm({ name: p.name, type: p.type, address: p.address, manager: p.manager?._id || '' });
    setErrors({});
  };

  const cancel = () => {
    setEditingId(null);
    setForm(EMPTY_PROPERTY);
    setErrors({});
  };

  const submit = async (e) => {
    e.preventDefault();
    const found = validateProperty(form);
    setErrors(found);
    if (hasErrors(found)) return;
    setBusy(true);
    try {
      const body = { ...form, manager: form.manager || null };
      const res = editingId ? await propertiesApi.update(editingId, body) : await propertiesApi.create(body);
      toast.success(res.message);
      cancel();
      reload();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (p) => {
    if (!window.confirm(`Delete ${p.name}?`)) return;
    try {
      await propertiesApi.remove(p._id);
      toast.success('Property deleted');
      reload();
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div className="split">
      <form className="panel" onSubmit={submit} noValidate>
        <h2 className="panel-title">{editingId ? 'Edit property' : 'Add a property'}</h2>
        <Field label="Name" error={errors.name}>
          <input value={form.name} onChange={set('name')} maxLength={120} />
        </Field>
        <Field label="Type" error={errors.type}>
          <select value={form.type} onChange={set('type')}>
            {PROPERTY_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Address" error={errors.address}>
          <input value={form.address} onChange={set('address')} maxLength={250} />
        </Field>
        <Field label="Manager">
          <select value={form.manager} onChange={set('manager')}>
            <option value="">No manager yet</option>
            {managers.map((m) => (
              <option key={m._id} value={m._id}>
                {m.name} ({label(m.role)})
              </option>
            ))}
          </select>
        </Field>
        <div className="row start">
          <button className="btn small" disabled={busy}>
            {editingId ? 'Save changes' : 'Add property'}
          </button>
          {editingId && (
            <button type="button" className="ghost" onClick={cancel}>
              Cancel
            </button>
          )}
        </div>
      </form>

      <div>
        {properties.length === 0 ? (
          <EmptyState title="No properties yet">Add the first one with the form.</EmptyState>
        ) : (
          properties.map((p) => (
            <article key={p._id} className="card">
              <div className="row">
                <h3>{p.name}</h3>
                <span className="tag">{label(p.type)}</span>
              </div>
              <p className="meta">{p.address}</p>
              <p className="meta">Manager: {p.manager?.name || 'none'}</p>
              <div className="row start">
                <button type="button" className="ghost" onClick={() => startEdit(p)}>
                  Edit
                </button>
                <button type="button" className="ghost danger" onClick={() => remove(p)}>
                  Delete
                </button>
              </div>
            </article>
          ))
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- Page
const TABS = [
  { id: 'overview', text: 'Statistics' },
  { id: 'users', text: 'Users' },
  { id: 'properties', text: 'Properties' },
];

export default function AdminPanel() {
  const toast = useToast();
  const [tab, setTab] = useState('overview');
  const [properties, setProperties] = useState([]);

  const loadProperties = useCallback(() => {
    propertiesApi
      .list()
      .then((res) => setProperties(res.data))
      .catch((err) => toast.error(err.message));
  }, [toast]);

  useEffect(loadProperties, [loadProperties]);

  return (
    <section>
      <h1>Admin panel</h1>
      <div className="tabs" role="tablist" aria-label="Admin sections">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            className={tab === t.id ? 'on' : ''}
            onClick={() => setTab(t.id)}
          >
            {t.text}
          </button>
        ))}
      </div>
      <div role="tabpanel">
        {tab === 'overview' && <Overview />}
        {tab === 'users' && <Users properties={properties} />}
        {tab === 'properties' && <Properties properties={properties} reload={loadProperties} />}
      </div>
    </section>
  );
}
