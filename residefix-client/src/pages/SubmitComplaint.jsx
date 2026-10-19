import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { complaintsApi, propertiesApi } from '../api/index.js';
import Field from '../components/Field.jsx';
import { ErrorMessage } from '../components/Feedback.jsx';
import { CATEGORIES, PRIORITIES, label } from '../utils/constants.js';
import { hasErrors, validateComplaint } from '../utils/validators.js';

export default function SubmitComplaint() {
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [properties, setProperties] = useState([]);
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: 'plumbing',
    priority: 'medium',
    property: user.property?._id || '',
    roomNumber: user.roomNumber || '',
    imagesText: '',
  });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    propertiesApi
      .list()
      .then((res) => setProperties(res.data))
      .catch((err) => setServerError(err.message));
  }, []);

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });
  // One image URL per line, blank lines ignored.
  const images = form.imagesText
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);

  const submit = async (e) => {
    e.preventDefault();
    const found = validateComplaint({ ...form, images });
    if (images.length > 5) found.images = 'Add up to 5 image links';
    setErrors(found);
    if (hasErrors(found)) return;

    setBusy(true);
    setServerError('');
    try {
      const { imagesText: _unused, ...body } = form;
      const res = await complaintsApi.create({ ...body, images });
      toast.success('Complaint submitted. Your manager has been notified on their dashboard.');
      navigate(`/complaints/${res.data._id}`);
    } catch (err) {
      setServerError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section>
      <h1>Report a problem</h1>
      <p className="hint">The more detail you give, the faster it can be fixed.</p>
      <form className="panel grid" onSubmit={submit} noValidate>
        <div className="wide">
          <ErrorMessage message={serverError} />
        </div>
        <Field label="Short title" error={errors.title} className="wide">
          <input maxLength={120} value={form.title} onChange={set('title')} placeholder="Bathroom tap keeps dripping" />
        </Field>
        <Field label="Property" error={errors.property}>
          <select value={form.property} onChange={set('property')}>
            <option value="">Select a property</option>
            {properties.map((p) => (
              <option key={p._id} value={p._id}>
                {p.name} ({label(p.type)})
              </option>
            ))}
          </select>
        </Field>
        <Field label="Room / unit">
          <input maxLength={20} value={form.roomNumber} onChange={set('roomNumber')} />
        </Field>
        <Field label="Category" error={errors.category}>
          <select value={form.category} onChange={set('category')}>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {label(c)}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Priority" error={errors.priority} hint="Urgent = safety risk or no water/power">
          <select value={form.priority} onChange={set('priority')}>
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {label(p)}
              </option>
            ))}
          </select>
        </Field>
        <Field label="What is wrong?" error={errors.description} className="wide">
          <textarea
            rows={5}
            maxLength={2000}
            value={form.description}
            onChange={set('description')}
            placeholder="When did it start, where exactly is it, what have you tried?"
          />
        </Field>
        <Field
          label="Photo links (optional)"
          error={errors.images}
          hint="Paste up to 5 image URLs, one per line"
          className="wide"
        >
          <textarea rows={2} value={form.imagesText} onChange={set('imagesText')} />
        </Field>
        <div className="wide row start">
          <button className="btn" disabled={busy}>
            {busy ? 'Submitting…' : 'Submit complaint'}
          </button>
          <button type="button" className="ghost big" onClick={() => navigate(-1)}>
            Cancel
          </button>
        </div>
      </form>
    </section>
  );
}
