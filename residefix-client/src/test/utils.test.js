import { describe, expect, it } from 'vitest';
import { validateComplaint, validateLogin, validateSignup, hasErrors } from '../utils/validators.js';
import { formatHours } from '../utils/format.js';
import { label } from '../utils/constants.js';
import { isTokenExpired } from '../utils/session.js';

/** Builds an unsigned JWT-shaped string with the given payload. */
const fakeToken = (payload) => `x.${btoa(JSON.stringify(payload))}.y`;

describe('validators', () => {
  it('flags bad login input', () => {
    expect(validateLogin({ email: 'nope', password: '' })).toEqual({
      email: expect.any(String),
      password: expect.any(String),
    });
    expect(hasErrors(validateLogin({ email: 'a@b.com', password: 'x' }))).toBe(false);
  });

  it('checks signup passwords match', () => {
    const errors = validateSignup({ name: 'A', email: 'a@b.com', password: 'secret1', confirmPassword: 'secret2' });
    expect(errors.confirmPassword).toMatch(/do not match/i);
  });

  it('validates complaints including image URLs', () => {
    const errors = validateComplaint({
      title: 'ok title',
      description: 'short',
      category: 'plumbing',
      priority: 'medium',
      property: 'p1',
      images: ['not a url'],
    });
    expect(Object.keys(errors).sort()).toEqual(['description', 'images']);
  });
});

describe('formatting helpers', () => {
  it('formats durations', () => {
    expect(formatHours(null)).toBe('-');
    expect(formatHours(0.5)).toBe('30 min');
    expect(formatHours(5)).toBe('5 hours');
    expect(formatHours(72)).toBe('3 days');
  });

  it('turns enum values into labels', () => {
    expect(label('in-progress')).toBe('In progress');
    expect(label('boarding-house')).toBe('Boarding house');
  });

  it('detects expired tokens', () => {
    const future = Math.floor(Date.now() / 1000) + 3600;
    expect(isTokenExpired(fakeToken({ exp: future }))).toBe(false);
    expect(isTokenExpired(fakeToken({ exp: 1 }))).toBe(true);
    expect(isTokenExpired('garbage')).toBe(true);
  });
});
