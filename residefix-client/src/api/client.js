import axios from 'axios';
import { getToken, clearSession } from '../utils/session.js';

/** Base URL comes from VITE_API_URL (see .env.example). */
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const client = axios.create({ baseURL: API_URL, timeout: 15000 });

// Attach the JWT to every request when the user is logged in.
client.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

/**
 * Unwraps the API's { success, data, meta, message } envelope and turns
 * failures into a plain Error with a readable message.
 */
client.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401 && getToken()) {
      // Token expired or account deleted: drop the session and let the app redirect.
      clearSession();
      window.dispatchEvent(new Event('residefix:logout'));
    }
    const message = error.response
      ? error.response.data?.message || `Request failed (${error.response.status})`
      : 'Cannot reach the server. Check that the API is running.';
    const err = new Error(message);
    err.status = error.response?.status;
    err.errors = error.response?.data?.errors;
    return Promise.reject(err);
  }
);

export default client;
