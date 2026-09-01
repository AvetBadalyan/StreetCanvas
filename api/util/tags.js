const { MAX_TAGS } = require("../models/place");
const { toSlug } = require("./slug");

/**
 * Tags arrive either as a comma-separated string (multipart form posts cannot
 * send arrays) or as a real array (JSON PATCH bodies). Normalise both into a
 * deduplicated list of lowercase slugs so filtering by tag is predictable.
 */
const normalizeTags = (raw) => {
  if (!raw) return [];

  const list = Array.isArray(raw) ? raw : String(raw).split(",");

  const slugs = list
    .map(toSlug)
    .filter((tag) => tag.length >= 2 && tag.length <= 24);

  return [...new Set(slugs)].slice(0, MAX_TAGS);
};

module.exports = { normalizeTags };
