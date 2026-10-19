/**
 * Reads ?page and ?limit from the query string, clamps them to safe values
 * and returns what Mongoose needs (skip/limit) plus a builder for the meta block.
 */
function getPagination(query, { defaultLimit = 10, maxLimit = 100 } = {}) {
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || defaultLimit, 1), maxLimit);
  return {
    page,
    limit,
    skip: (page - 1) * limit,
    meta: (total) => ({ page, limit, total, pages: Math.max(Math.ceil(total / limit), 1) }),
  };
}

/** Escapes user input so it can be used safely inside a RegExp. */
const escapeRegex = (text) => String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

module.exports = { getPagination, escapeRegex };
