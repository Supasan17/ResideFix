import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { propertiesApi } from '../api/index.js';
import Field from '../components/Field.jsx';
import { label } from '../utils/constants.js';
import { formatDate } from '../utils/format.js';

export default function Profile() {
  const { user, updateProfile } = useAuth();
  const toast = useToast();
  const [properties, setProperties] = useState([]);
  const [details, setDetails] = useState({
    name: user.name,
    phone: user.phone || '',
    property: user.property?._id || '',
    roomNumber: user.roomNumber || '',
  });
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState('');

  useEffect(() => {
    propertiesApi
      .list()
      .then((res) => setProperties(res.data))
      .catch(() => setProperties([]));
  }, []);

  const saveDetails = async (e) => {
    e.preventDefault();
    if (!details.name.trim()) {
      setErrors({ name: 'Name cannot be empty' });
      return;
    }
    setErrors({});
    setBusy('details');
    try {
      await updateProfile({ ...details, property: details.property || null });
      toast.success('Profile saved');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy('');
    }
  };

  const changePassword = async (e) => {
    e.preventDefault();
    const found = {};
    if (!pw.currentPassword) found.currentPassword = 'Enter your current password';
    if (pw.newPassword.length < 6) found.newPassword = 'At least 6 characters';
    if (pw.newPassword !== pw.confirm) found.confirm = 'Passwords do not match';
    setErrors(found);
    if (Object.keys(found).length) return;

    setBusy('password');
    try {
      await updateProfile({ currentPassword: pw.currentPassword, newPassword: pw.newPassword });
      setPw({ currentPassword: '', newPassword: '', confirm: '' });
      toast.success('Password changed');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy('');
    }
  };

  return (
    <section>
      <h1>Your profile</h1>
      <p className="hint">
        {user.email} · {label(user.role)} · member since {formatDate(user.createdAt)}
      </p>
      <div className="split">
        <form className="panel" onSubmit={saveDetails} noValidate>
          <h2 className="panel-title">Details</h2>
          <Field label="Full name" error={errors.name}>
            <input value={details.name} onChange={(e) => setDetails({ ...details, name: e.target.value })} />
          </Field>
          <Field label="Phone">
            <input type="tel" value={details.phone} onChange={(e) => setDetails({ ...details, phone: e.target.value })} />
          </Field>
          {user.role === 'resident' && (
            <>
              <Field label="Property">
                <select value={details.property} onChange={(e) => setDetails({ ...details, property: e.target.value })}>
                  <option value="">None</option>
                  {properties.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Room / unit">
                <input value={details.roomNumber} onChange={(e) => setDetails({ ...details, roomNumber: e.target.value })} />
              </Field>
            </>
          )}
          <button className="btn small" disabled={busy === 'details'}>
            {busy === 'details' ? 'Saving…' : 'Save details'}
          </button>
        </form>

        <form className="panel" onSubmit={changePassword} noValidate>
          <h2 className="panel-title">Change password</h2>
          <Field label="Current password" error={errors.currentPassword}>
            <input
              type="password"
              autoComplete="current-password"
              value={pw.currentPassword}
              onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })}
            />
          </Field>
          <Field label="New password" error={errors.newPassword}>
            <input
              type="password"
              autoComplete="new-password"
              value={pw.newPassword}
              onChange={(e) => setPw({ ...pw, newPassword: e.target.value })}
            />
          </Field>
          <Field label="Confirm new password" error={errors.confirm}>
            <input
              type="password"
              autoComplete="new-password"
              value={pw.confirm}
              onChange={(e) => setPw({ ...pw, confirm: e.target.value })}
            />
          </Field>
          <button className="btn small" disabled={busy === 'password'}>
            {busy === 'password' ? 'Changing…' : 'Change password'}
          </button>
        </form>
      </div>
    </section>
  );
}
