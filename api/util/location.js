const HttpError = require("../models/http-error");

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const REQUEST_TIMEOUT_MS = 8000;

// Nominatim's usage policy requires an identifying User-Agent and rejects
// requests that omit one, which is easy to miss because it fails as an empty
// result set rather than an error.
const USER_AGENT =
  process.env.GEOCODER_USER_AGENT || "StreetCanvas/1.0 (portfolio project)";

// The same handful of addresses get geocoded repeatedly while browsing, and the
// public endpoint is rate limited to ~1 req/s, so keep recent lookups in memory.
const cache = new Map();
const CACHE_MAX_ENTRIES = 500;

const remember = (key, value) => {
  if (cache.size >= CACHE_MAX_ENTRIES) {
    cache.delete(cache.keys().next().value);
  }
  cache.set(key, value);
};

/**
 * Resolves a free-text address to coordinates.
 * Throws an HttpError rather than returning null: a null here used to flow
 * straight into `new Artwork({ location: null })` and surface as an opaque
 * mongoose validation failure instead of a useful message.
 */
const getCoordsForAddress = async (address) => {
  const key = address.trim().toLowerCase();
  if (cache.has(key)) {
    return cache.get(key);
  }

  const url = `${NOMINATIM_URL}?format=json&limit=1&q=${encodeURIComponent(
    address
  )}`;

  let data;
  try {
    const response = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, "Accept-Language": "en" },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (!response.ok) {
      throw new Error(`Nominatim responded with ${response.status}`);
    }
    data = await response.json();
  } catch (err) {
    console.error(`[geocoder] lookup failed for "${address}": ${err.message}`);
    throw new HttpError(
      "The address lookup service is unavailable right now. Please try again in a moment.",
      503
    );
  }

  if (!Array.isArray(data) || data.length === 0) {
    throw new HttpError(
      `We could not find "${address}" on the map. Try adding a city or country.`,
      422
    );
  }

  const coordinates = {
    lat: parseFloat(data[0].lat),
    lng: parseFloat(data[0].lon),
  };

  if (Number.isNaN(coordinates.lat) || Number.isNaN(coordinates.lng)) {
    throw new HttpError(
      `We could not resolve coordinates for "${address}".`,
      422
    );
  }

  remember(key, coordinates);
  return coordinates;
};

module.exports = getCoordsForAddress;
