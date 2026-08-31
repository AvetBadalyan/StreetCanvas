const DEFAULT_LIMIT = 12;
const MAX_LIMIT = 48;

const DEFAULT_RADIUS_KM = 25;
const MAX_RADIUS_KM = 200;

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

/**
 * Reads `?near=lat,lng&radius=km` into the shape the $geoNear stage needs.
 *
 * Returns null when `near` is absent or unusable, which the caller treats as
 * "no proximity filter" rather than as an error - a malformed coordinate from a
 * flaky geolocation API should degrade to the normal listing, not break it.
 */
const parseNearby = (query) => {
  if (!query.near) return null;

  const [lat, lng] = String(query.near).split(",").map(Number);
  const validLat = Number.isFinite(lat) && lat >= -90 && lat <= 90;
  const validLng = Number.isFinite(lng) && lng >= -180 && lng <= 180;
  if (!validLat || !validLng) return null;

  const requested = parseFloat(query.radius) || DEFAULT_RADIUS_KM;
  const radiusKm = Math.min(MAX_RADIUS_KM, Math.max(1, requested));

  return { lat, lng, radiusKm, radiusMeters: radiusKm * 1000 };
};

module.exports = {
  escapeRegex,
  parsePagination,
  buildPaginationMeta,
  parseNearby,
};
