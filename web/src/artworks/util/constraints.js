/**
 * Field limits, mirrored from the API's validation rules in
 * `routes/artworks-routes.js` and `models/artwork.js`.
 *
 * Kept here so the form can reject an over-long story before the round trip
 * instead of surfacing a 422 after the user has already hit submit.
 */
export const TITLE_MIN = 3;
export const TITLE_MAX = 80;
export const DESCRIPTION_MIN = 10;
export const DESCRIPTION_MAX = 2000;
export const ARTIST_MAX = 80;
export const ADDRESS_MIN = 3;
export const ADDRESS_MAX = 200;
