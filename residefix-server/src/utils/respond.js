/**
 * Helpers that keep every successful response in the same shape:
 *   { success: true, message?, data, meta? }
 * Errors use { success: false, message, errors? } (see middleware/errorHandler.js).
 */
function ok(res, data, { message, meta, status = 200 } = {}) {
  const body = { success: true };
  if (message) body.message = message;
  body.data = data;
  if (meta) body.meta = meta;
  return res.status(status).json(body);
}

function created(res, data, message = 'Created') {
  return ok(res, data, { message, status: 201 });
}

module.exports = { ok, created };
