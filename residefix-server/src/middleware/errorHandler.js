const ApiError = require('../utils/ApiError');
const config = require('../config/env');

/** 404 for any /api route that no router handled. */
function notFound(req, _res, next) {
  next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
}

/**
 * Converts every thrown error into the standard JSON error shape:
 *   { success: false, message, errors? }
 * Known Mongoose / JWT / body-parser errors get a friendly status code.
 */
function errorHandler(err, _req, res, _next) {
  let status = err.statusCode || err.status || 500;
  let message = err.message || 'Something went wrong';
  let errors = err.errors && Array.isArray(err.errors) ? err.errors : undefined;

  if (err.name === 'ValidationError' && err.errors) {
    // Mongoose schema validation
    status = 400;
    errors = Object.values(err.errors).map((e) => ({ field: e.path, message: e.message }));
    message = errors[0]?.message || 'Validation failed';
  } else if (err.name === 'CastError') {
    status = 400;
    message = `Invalid ${err.path}: ${err.value}`;
  } else if (err.code === 11000) {
    // Duplicate key (e.g. email already registered)
    status = 409;
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    message = `That ${field} is already in use`;
  } else if (err.type === 'entity.parse.failed') {
    status = 400;
    message = 'Request body is not valid JSON';
  }

  if (status >= 500) {
    if (!config.isTest) console.error(err);
    if (config.isProduction) message = 'Internal server error';
  }

  const body = { success: false, message };
  if (errors) body.errors = errors;
  if (!config.isProduction && status >= 500 && err.stack) body.stack = err.stack;
  res.status(status).json(body);
}

module.exports = { notFound, errorHandler, ApiError };
