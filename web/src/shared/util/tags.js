/**
 * Tag rules mirrored from the API (`api/util/tags.js`, `api/models/place.js`),
 * which stays authoritative. Duplicated so a tag is accepted or rejected as you
 * type rather than silently rewritten on submit - see NOTES.md.
 */
export const MAX_TAGS = 8;
export const MIN_TAG_LENGTH = 2;
export const MAX_TAG_LENGTH = 24;

/** Returns the slug the server would store, or "" if the input is unusable. */
export const normalizeTag = (raw) =>
  String(raw)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "");
