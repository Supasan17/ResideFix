/**
 * Wraps an async route handler so a rejected promise is passed to next()
 * and reaches the central error handler instead of crashing the process.
 */
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

module.exports = asyncHandler;
