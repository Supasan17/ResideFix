import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { propertiesApi } from '../api/index.js';
import Field from '../components/Field.jsx';
import { ErrorMessage } from '../components/Feedback.jsx';
import { hasErrors, validateSignup } from '../utils/validators.js';
import { label } from '../utils/constants.js';

const EMPTY = {
  name: '',
  email: '',
  phone: '',
  property: '',
  roomNumber: '',
  password: '',
  confirmPassword: '',
  managerCode: '',
};

export default function Signup() {
  const { user, signup } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY);
  const [properties, setProperties] = useState([]);
  const [isManager, setIsManager] = useState(false);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [busy, setBusy] = useState(false);

  // Property list is public so residents can choose where they live.
  useEffect(() => {
    propertiesApi
      .list()
      .then((res) => setProperties(res.data))
      .catch(() => setProperties([]));
  }, []);

  if (user) return <Navigate to="/dashboard" replace />;

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    const found = validateSignup(form);
    if (isManager && !form.managerCode.trim()) found.managerCode = 'Enter the manager code';
    setErrors(found);
    if (hasErrors(found)) return;

    setBusy(true);
    setServerError('');
    try {
      const { confirmPassword: _unused, ...body } = form;
      if (!isManager) delete body.managerCode;
      const u = await signup(body);
      toast.success(`Account created. Welcome, ${u.name.split(' ')[0]}!`);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setServerError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="panel narrow wide-form" onSubmit={submit} noValidate>
      <h2>Create your account</h2>
      <ErrorMessage message={serverError} />
      <div className="grid">
        <Field label="Full name" error={errors.name} className="wide">
          <input autoComplete="name" value={form.name} onChange={set('name')} />
        </Field>
        <Field label="Email" error={errors.email}>
          <input type="email" autoComplete="email" value={form.email} onChange={set('email')} />
        </Field>
        <Field label="Phone (optional)" error={errors.phone}>
          <input type="tel" autoComplete="tel" value={form.phone} onChange={set('phone')} />
        </Field>
        <Field label="Where do you live?" hint="You can change this later in your profile">
          <select value={form.property} onChange={set('property')}>
            <option value="">Select a property</option>
            {properties.map((p) => (
              <option key={p._id} value={p._id}>
                {p.name} ({label(p.type)})
              </option>
            ))}
          </select>
        </Field>
        <Field label="Room / unit (optional)">
          <input value={form.roomNumber} onChange={set('roomNumber')} />
        </Field>
        <Field label="Password" error={errors.password} hint="At least 6 characters">
          <input type="password" autoComplete="new-password" value={form.password} onChange={set('password')} />
        </Field>
        <Field label="Confirm password" error={errors.confirmPassword}>
          <input
            type="password"
            autoComplete="new-password"
            value={form.confirmPassword}
            onChange={set('confirmPassword')}
          />
        </Field>
      </div>
      <label className="check">
        <input type="checkbox" checked={isManager} onChange={(e) => setIsManager(e.target.checked)} /> I
        am a property manager
      </label>
      {isManager && (
        <Field label="Manager code" error={errors.managerCode} hint="Ask your administrator for this code">
          <input value={form.managerCode} onChange={set('managerCode')} />
        </Field>
      )}
      <button className="btn" disabled={busy}>
        {busy ? 'Creating…' : 'Sign up'}
      </button>
      <p className="hint">
        Already registered? <Link to="/login">Log in</Link>
      </p>
    </form>
  );
}
