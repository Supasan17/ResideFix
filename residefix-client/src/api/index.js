/**
 * One small function per API endpoint so pages never build URLs by hand.
 * Each returns the API envelope: { success, data, meta?, message? }.
 */
import client from './client.js';

/** Removes empty values so they are not sent as ?status=&category= */
const clean = (params = {}) =>
  Object.fromEntries(Object.entries(params).filter(([, v]) => v !== '' && v !== null && v !== undefined));

export const authApi = {
  register: (body) => client.post('/auth/register', body),
  login: (body) => client.post('/auth/login', body),
  me: () => client.get('/auth/me'),
  updateMe: (body) => client.patch('/auth/me', body),
};

export const complaintsApi = {
  list: (params) => client.get('/complaints', { params: clean(params) }),
  get: (id) => client.get(`/complaints/${id}`),
  create: (body) => client.post('/complaints', body),
  update: (id, body) => client.patch(`/complaints/${id}`, body),
  remove: (id) => client.delete(`/complaints/${id}`),
  comment: (id, text) => client.post(`/complaints/${id}/comments`, { text }),
  setStatus: (id, status, note) => client.patch(`/complaints/${id}/status`, { status, note }),
  assign: (id, assignedTo) => client.patch(`/complaints/${id}/assign`, { assignedTo }),
};

export const propertiesApi = {
  list: () => client.get('/properties'),
  mine: () => client.get('/properties/mine'),
  create: (body) => client.post('/properties', body),
  update: (id, body) => client.patch(`/properties/${id}`, body),
  remove: (id) => client.delete(`/properties/${id}`),
};

export const usersApi = {
  list: (params) => client.get('/users', { params: clean(params) }),
  staff: () => client.get('/users/staff'),
  update: (id, body) => client.patch(`/users/${id}`, body),
  remove: (id) => client.delete(`/users/${id}`),
};

export const statsApi = {
  get: () => client.get('/stats'),
};
