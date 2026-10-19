/**
 * Client-side form validation. Each validator returns an object of
 * { fieldName: 'error message' }; an empty object means the form is valid.
 * The server validates again, these only give faster feedback.
 */
import { CATEGORIES, PRIORITIES } from './constants.js';

const EMAIL_RX = /^\S+@\S+\.\S+$/;

export function validateLogin({ email, password }) {
  const errors = {};
  if (!EMAIL_RX.test(email || '')) errors.email = 'Enter a valid email address';
  if (!password) errors.password = 'Enter your password';
  return errors;
}

export function validateSignup({ name, email, password, confirmPassword, phone }) {
  const errors = {};
  if (!name || !name.trim()) errors.name = 'Enter your name';
  if (!EMAIL_RX.test(email || '')) errors.email = 'Enter a valid email address';
  if (!password || password.length < 6) errors.password = 'Password must be at least 6 characters';
  if (password !== confirmPassword) errors.confirmPassword = 'Passwords do not match';
  if (phone && !/^[+\d\s()-]{7,20}$/.test(phone)) errors.phone = 'Enter a valid phone number';
  return errors;
}

export function validateComplaint({ title, description, category, priority, property, images = [] }) {
  const errors = {};
  if (!title || title.trim().length < 3) errors.title = 'Title must be at least 3 characters';
  else if (title.length > 120) errors.title = 'Title must be 120 characters or fewer';
  if (!description || description.trim().length < 10) {
    errors.description = 'Describe the problem in at least 10 characters';
  } else if (description.length > 2000) errors.description = 'Description is too long';
  if (!CATEGORIES.includes(category)) errors.category = 'Choose a category';
  if (!PRIORITIES.includes(priority)) errors.priority = 'Choose a priority';
  if (!property) errors.property = 'Choose the property';
  const badUrl = images.filter(Boolean).find((u) => !/^https?:\/\/\S+$/i.test(u));
  if (badUrl) errors.images = `"${badUrl}" is not a valid http(s) URL`;
  return errors;
}

export function validateProperty({ name, type, address }) {
  const errors = {};
  if (!name || !name.trim()) errors.name = 'Enter the property name';
  if (!type) errors.type = 'Choose a type';
  if (!address || !address.trim()) errors.address = 'Enter the address';
  return errors;
}

export const hasErrors = (errors) => Object.keys(errors).length > 0;
