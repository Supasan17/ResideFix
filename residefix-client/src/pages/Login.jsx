import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import Field from '../components/Field.jsx';
import { ErrorMessage } from '../components/Feedback.jsx';
import { hasErrors, validateLogin } from '../utils/validators.js';

export default function Login() {
  const { user, login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '', remember: false });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/dashboard" replace />;

  const set = (key) => (e) =>
    setForm({ ...form, [key]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    const found = validateLogin(form);
    setErrors(found);
    if (hasErrors(found)) return;

    setBusy(true);
    setServerError('');
    try {
      const u = await login(form.email.trim(), form.password, form.remember);
      toast.success(`Welcome back, ${u.name.split(' ')[0]}!`);
      navigate(location.state?.from || '/dashboard', { replace: true });
    } catch (err) {
      setServerError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="panel narrow" onSubmit={submit} noValidate>
      <h2>Log in</h2>
      <ErrorMessage message={serverError} />
      <Field label="Email" error={errors.email}>
        <input type="email" autoComplete="email" value={form.email} onChange={set('email')} />
      </Field>
      <Field label="Password" error={errors.password}>
        <input
          type="password"
          autoComplete="current-password"
          value={form.password}
          onChange={set('password')}
        />
      </Field>
      <label className="check">
        <input type="checkbox" checked={form.remember} onChange={set('remember')} /> Keep me signed in on
        this device
      </label>
      <button className="btn" disabled={busy}>
        {busy ? 'Logging in…' : 'Log in'}
      </button>
      <p className="hint">
        New here? <Link to="/signup">Create an account</Link>
      </p>
    </form>
  );
}
