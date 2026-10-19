const { validationResult } = require('express-validator');
const ApiError = require('../utils/ApiError');

/**
 * Runs after a list of express-validator rules. If any rule failed it stops
 * the request with a 400 and a field-by-field list of messages.
 */
function validate(req, _res, next) {
  const result = validationResult(req);
  if (result.isEmpty()) return next();

  const errors = result.array().map((e) => ({ field: e.path, message: e.msg }));
  return next(ApiError.badRequest(errors[0].message, errors));
}

module.exports = validate;
