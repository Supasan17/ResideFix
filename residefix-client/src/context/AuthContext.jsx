import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authApi } from '../api/index.js';
import { clearSession, getToken, saveToken } from '../utils/session.js';

const AuthContext = createContext(null);

/**
 * Holds the logged-in user. On first load it validates any stored token by
 * calling GET /auth/me, so a revoked or expired session is cleared straight away.
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(() => Boolean(getToken()));

  useEffect(() => {
    if (!getToken()) return;
    authApi
      .me()
      .then((res) => setUser(res.data))
      .catch(() => clearSession())
      .finally(() => setLoading(false));
  }, []);

  // The API client fires this event on any 401 so every page logs out consistently.
  useEffect(() => {
    const onLogout = () => setUser(null);
    window.addEventListener('residefix:logout', onLogout);
    return () => window.removeEventListener('residefix:logout', onLogout);
  }, []);

  const login = useCallback(async (email, password, remember = false) => {
    const res = await authApi.login({ email, password });
    saveToken(res.data.token, remember);
    setUser(res.data.user);
    return res.data.user;
  }, []);

  const signup = useCallback(async (form) => {
    const res = await authApi.register(form);
    saveToken(res.data.token, false);
    setUser(res.data.user);
    return res.data.user;
  }, []);

  const logout = useCallback(() => {
    clearSession();
    setUser(null);
  }, []);

  const updateProfile = useCallback(async (body) => {
    const res = await authApi.updateMe(body);
    setUser(res.data);
    return res;
  }, []);

  const value = useMemo(
    () => ({ user, loading, login, signup, logout, updateProfile, setUser }),
    [user, loading, login, signup, logout, updateProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

export { AuthContext };
