const DEFAULT_LIMIT = 12;
const MAX_LIMIT = 48;

// User input goes into a $regex, so metacharacters have to be neutralised or a
// search for "a(" becomes an invalid-regex 500.
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const parsePagination = (query) => {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const requested = parseInt(query.limit, 10) || DEFAULT_LIMIT;
  const limit = Math.min(MAX_LIMIT, Math.max(1, requested));
  return { page, limit, skip: (page - 1) * limit };
};

const buildPaginationMeta = ({ page, limit, total }) => {
  const pages = Math.max(1, Math.ceil(total / limit));
  return { page, limit, total, pages, hasMore: page < pages };
};

module.exports = { escapeRegex, parsePagination, buildPaginationMeta };
