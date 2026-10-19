/**
 * Central place that reads environment variables, applies sensible defaults
 * and exposes a single typed config object to the rest of the app.
 */
require('dotenv').config();

const toList = (value) =>
  (value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

const config = {
  env: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 5000,
  mongoUri: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/residefix',
  jwtSecret: process.env.JWT_SECRET || 'dev-only-secret-change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  managerSignupCode: process.env.MANAGER_SIGNUP_CODE || '',
  clientOrigins: toList(process.env.CLIENT_ORIGIN || 'http://localhost:5173'),
  rateLimitMax: Number(process.env.RATE_LIMIT_MAX) || 300,
  authRateLimitMax: Number(process.env.AUTH_RATE_LIMIT_MAX) || 30,
};

config.isTest = config.env === 'test';
config.isProduction = config.env === 'production';

if (config.isProduction && config.jwtSecret === 'dev-only-secret-change-me') {
  // Refuse to start in production with the development secret.
  throw new Error('JWT_SECRET must be set in production');
}

module.exports = config;
