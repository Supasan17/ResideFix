import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { complaintsApi, usersApi } from '../api/index.js';
import Loader from '../components/Loader.jsx';
import { ErrorMessage } from '../components/Feedback.jsx';
import { PriorityBadge, StatusBadge } from '../components/Badges.jsx';
import StatusTimeline from '../components/StatusTimeline.jsx';
import CommentThread from '../components/CommentThread.jsx';
import { STATUSES, label } from '../utils/constants.js';
import { formatDateTime } from '../utils/format.js';

/** Staff controls: change status (with a note) and assign to a manager/admin. */
function StaffActions({ complaint, onUpdated }) {
  const toast = useToast();
  const [staff, setStaff] = useState([]);
  const [status, setStatus] = useState(complaint.status);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    usersApi
      .staff()
      .then((res) => setStaff(res.data))
      .catch(() => setStaff([]));
  }, []);

  useEffect(() => setStatus(complaint.status), [complaint.status]);

  const run = async (action) => {
    setBusy(true);
    try {
      const res = await action();
      onUpdated(res.data);
      toast.success(res.message);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const changeStatus = (e) => {
    e.preventDefault();
    if (status === complaint.status) {
      toast.info('Pick a different status first');
      return;
    }
    run(() => complaintsApi.setStatus(complaint._id, status, note)).then(() => setNote(''));
  };

  return (
    <div className="panel">
      <h2 className="panel-title">Manage</h2>
      <form onSubmit={changeStatus} className="stack">
        <label>
          Status
          <select value={status} onChange={(e) => setStatus(e.target.value)} disabled={busy}>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {label(s)}
              </option>
            ))}
          </select>
        </label>
        <label>
          Note for the timeline (optional)
          <input value={note} maxLength={300} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Plumber visited" />
        </label>
        <button className="btn small" disabled={busy}>
          Update status
        </button>
      </form>
      <label className="assign">
        Assigned to
        <select
          value={complaint.assignedTo?._id || ''}
          disabled={busy}
          onChange={(e) => run(() => complaintsApi.assign(complaint._id, e.target.value || null))}
        >
          <option value="">Nobody</option>
          {staff.map((s) => (
            <option key={s._id} value={s._id}>
              {s.name} ({label(s.role)})
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

export default function ComplaintDetails() {
  const { id } = useParams();
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [complaint, setComplaint] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await complaintsApi.get(id);
      setComplaint(res.data);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading && !complaint) return <Loader />;
  if (error && !complaint) {
    return (
      <section>
        <ErrorMessage message={error} onRetry={load} />
        <Link to="/dashboard">← Back to dashboard</Link>
      </section>
    );
  }

  const c = complaint;
  const isStaff = user.role === 'manager' || user.role === 'admin';
  const isOwner = String(c.resident?._id) === String(user._id);
  const canWithdraw = (isOwner && c.status === 'open') || user.role === 'admin';

  const addComment = async (text) => {
    const res = await complaintsApi.comment(c._id, text);
    setComplaint(res.data);
  };

  const confirmFixed = async () => {
    try {
      const res = await complaintsApi.setStatus(c._id, 'closed', 'Resident confirmed the fix');
      setComplaint(res.data);
      toast.success('Thanks! The complaint is now closed.');
    } catch (err) {
      toast.error(err.message);
    }
  };

  const withdraw = async () => {
    if (!window.confirm('Delete this complaint? This cannot be undone.')) return;
    try {
      await complaintsApi.remove(c._id);
      toast.success('Complaint deleted');
      navigate(user.role === 'resident' ? '/my-complaints' : '/manage');
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <section>
      <button type="button" className="link-btn" onClick={() => navigate(-1)}>
        ← Back
      </button>
      <div className="page-head">
        <div>
          <h1>{c.title}</h1>
          <div className="row start">
            <StatusBadge status={c.status} />
            <PriorityBadge priority={c.priority} />
            <span className="hint">{label(c.category)}</span>
          </div>
        </div>
        {canWithdraw && (
          <button type="button" className="ghost danger" onClick={withdraw}>
            {isOwner ? 'Withdraw complaint' : 'Delete complaint'}
          </button>
        )}
      </div>

      <div className="details">
        <div className="details-main">
          <div className="panel">
            <p className="pre">{c.description}</p>
            {c.images?.length > 0 && (
              <div className="images">
                {c.images.map((src) => (
                  <a key={src} href={src} target="_blank" rel="noreferrer noopener">
                    <img src={src} alt="Attached to the complaint" loading="lazy" />
                  </a>
                ))}
              </div>
            )}
            <dl className="facts">
              <dt>Property</dt>
              <dd>
                {c.property?.name} {c.roomNumber && `· room ${c.roomNumber}`}
              </dd>
              <dt>Reported by</dt>
              <dd>
                {c.resident?.name}
                {isStaff && c.resident?.phone && ` · ${c.resident.phone}`}
              </dd>
              <dt>Assigned to</dt>
              <dd>{c.assignedTo?.name || 'Not assigned yet'}</dd>
              <dt>Submitted</dt>
              <dd>{formatDateTime(c.createdAt)}</dd>
              <dt>Last update</dt>
              <dd>{formatDateTime(c.updatedAt)}</dd>
            </dl>
            {isOwner && c.status === 'resolved' && (
              <div className="callout">
                <span>Has the problem been fixed?</span>
                <button type="button" className="btn small" onClick={confirmFixed}>
                  Yes, close it
                </button>
              </div>
            )}
          </div>

          <div className="panel">
            <h2 className="panel-title">Conversation ({c.comments.length})</h2>
            <CommentThread
              comments={c.comments}
              currentUserId={user._id}
              onSubmit={addComment}
              disabled={c.status === 'closed'}
            />
            {c.status === 'closed' && <p className="hint">This complaint is closed.</p>}
          </div>
        </div>

        <aside className="details-side">
          {isStaff && <StaffActions complaint={c} onUpdated={setComplaint} />}
          <div className="panel">
            <h2 className="panel-title">Status timeline</h2>
            <StatusTimeline history={c.statusHistory} />
          </div>
        </aside>
      </div>
    </section>
  );
}
