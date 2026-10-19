const rateLimit = require('express-rate-limit');
const config = require('../config/env');

const WINDOW_MS = 15 * 60 * 1000;
const message = { success: false, message: 'Too many requests, please try again later' };

// Tests fire many requests quickly, so limits are skipped when NODE_ENV=test.
const skip = () => config.isTest;

/** General limit applied to every /api route. */
const apiLimiter = rateLimit({
  windowMs: WINDOW_MS,
  limit: config.rateLimitMax,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message,
  skip,
});

/** Stricter limit for login/register to slow down password guessing. */
const authLimiter = rateLimit({
  windowMs: WINDOW_MS,
  limit: config.authRateLimitMax,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message,
  skip,
});

module.exports = { apiLimiter, authLimiter };
