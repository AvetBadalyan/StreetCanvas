/**
 * Lowercases, trims and strips a string down to `[a-z0-9-]`, so tags typed by
 * a contributor and categories imported from Wikidata end up in the same
 * predictable shape.
 */
const toSlug = (value) =>
  String(value)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "");

module.exports = { toSlug };
