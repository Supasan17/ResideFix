import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ProtectedRoute from '../components/ProtectedRoute.jsx';
import { AuthContext } from '../context/AuthContext.jsx';

/** Renders a small route tree with a fake auth state. */
function renderWithAuth(authValue, path = '/admin') {
  return render(
    <AuthContext.Provider value={authValue}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/login" element={<p>Login page</p>} />
          <Route path="/dashboard" element={<p>Dashboard page</p>} />
          <Route element={<ProtectedRoute roles={['admin']} />}>
            <Route path="/admin" element={<p>Admin page</p>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>
  );
}

describe('ProtectedRoute', () => {
  it('redirects visitors who are not logged in to the login page', () => {
    renderWithAuth({ user: null, loading: false });
    expect(screen.getByText('Login page')).toBeInTheDocument();
  });

  it('shows a loader while the session is being checked', () => {
    renderWithAuth({ user: null, loading: true });
    expect(screen.getByRole('status')).toHaveTextContent(/checking your session/i);
  });

  it('sends users without the right role to the dashboard', () => {
    renderWithAuth({ user: { name: 'R', role: 'resident' }, loading: false });
    expect(screen.getByText('Dashboard page')).toBeInTheDocument();
  });

  it('renders the page for an allowed role', () => {
    renderWithAuth({ user: { name: 'A', role: 'admin' }, loading: false });
    expect(screen.getByText('Admin page')).toBeInTheDocument();
  });
});
