import { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { label } from '../utils/constants.js';

/** Navigation links per role. */
const LINKS = {
  resident: [
    { to: '/dashboard', text: 'Dashboard' },
    { to: '/my-complaints', text: 'My complaints' },
    { to: '/complaints/new', text: 'Report a problem' },
  ],
  manager: [
    { to: '/dashboard', text: 'Dashboard' },
    { to: '/manage', text: 'Manage complaints' },
  ],
  admin: [
    { to: '/dashboard', text: 'Dashboard' },
    { to: '/manage', text: 'Complaints' },
    { to: '/admin', text: 'Admin panel' },
  ],
};

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const close = () => setMenuOpen(false);

  const handleLogout = () => {
    logout();
    close();
    navigate('/');
  };

  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="bar">
        <Link to="/" className="brand" onClick={close}>
          Reside<span>Fix</span>
        </Link>
        <button
          type="button"
          className="menu-toggle"
          aria-expanded={menuOpen}
          aria-controls="main-nav"
          onClick={() => setMenuOpen((o) => !o)}
        >
          Menu
        </button>
        <nav id="main-nav" className={menuOpen ? 'open' : ''} aria-label="Main">
          {user ? (
            <>
              {LINKS[user.role].map((l) => (
                <NavLink key={l.to} to={l.to} onClick={close} end>
                  {l.text}
                </NavLink>
              ))}
              <NavLink to="/profile" className="who" onClick={close}>
                {user.name} <small>({label(user.role)})</small>
              </NavLink>
              <button type="button" className="ghost on-dark" onClick={handleLogout}>
                Log out
              </button>
            </>
          ) : (
            <>
              <NavLink to="/login" onClick={close}>
                Log in
              </NavLink>
              <Link to="/signup" className="btn small" onClick={close}>
                Sign up
              </Link>
            </>
          )}
        </nav>
      </header>
      <main id="main">
        <Outlet />
      </main>
      <footer className="footer">
        ResideFix &middot; accommodation complaint tracker &middot; {new Date().getFullYear()}
      </footer>
    </>
  );
}
