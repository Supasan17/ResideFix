/**
 * Session storage for the JWT.
 *
 * The token lives in sessionStorage by default (cleared when the browser tab
 * closes) and only in localStorage when the user ticks "Keep me signed in".
 * Expired tokens are discarded on read, so a stale token is never sent.
 */
const KEY = 'residefix-token';

/** Decodes the JWT payload (no verification - the server does that). */
export function decodeToken(token) {
  try {
    const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(payload));
  } catch {
    return null;
  }
}

export function isTokenExpired(token) {
  const payload = decodeToken(token);
  if (!payload?.exp) return true;
  return payload.exp * 1000 <= Date.now();
}

function safeGet(storage) {
  try {
    return storage.getItem(KEY);
  } catch {
    return null;
  }
}

export function getToken() {
  const token = safeGet(sessionStorage) || safeGet(localStorage);
  if (token && isTokenExpired(token)) {
    clearSession();
    return null;
  }
  return token;
}

export function saveToken(token, remember) {
  clearSession();
  try {
    (remember ? localStorage : sessionStorage).setItem(KEY, token);
  } catch {
    // Storage blocked (private mode): the user stays logged in until refresh.
  }
}

export function clearSession() {
  try {
    sessionStorage.removeItem(KEY);
    localStorage.removeItem(KEY);
  } catch {
    // Ignore storage errors
  }
}
