/**
 * Route maths for the day planner.
 *
 * Everything here is pure and runs in the browser - no routing service, no API
 * key, no cost. That is a deliberate trade: distances are straight-line, not
 * driving distances, and the ordering is a good guess rather than an optimal
 * tour. For "which four monasteries should I string together today" that is
 * genuinely enough, and the UI says so rather than implying otherwise.
 */

const EARTH_RADIUS_KM = 6371;

const toRadians = (degrees) => (degrees * Math.PI) / 180;

/**
 * Great-circle distance between two points, in kilometres.
 * https://en.wikipedia.org/wiki/Haversine_formula
 */
export const distanceKm = (a, b) => {
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);

  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
};

/**
 * Orders stops by repeatedly hopping to the nearest one not yet visited.
 *
 * This is the classic greedy heuristic for the travelling salesman problem. It
 * is not guaranteed optimal - finding the true shortest tour is NP-hard - but
 * for the handful of stops someone fits into a day it produces a sensible
 * order in microseconds, which is the right trade here.
 *
 * @param {{lat:number,lng:number}} start where the day begins
 * @param {Array<{location:{lat:number,lng:number}}>} places
 */
export const orderByNearest = (start, places) => {
  const remaining = [...places];
  const ordered = [];
  let cursor = start;

  while (remaining.length > 0) {
    let bestIndex = 0;
    let bestDistance = Infinity;

    remaining.forEach((place, index) => {
      const d = distanceKm(cursor, place.location);
      if (d < bestDistance) {
        bestDistance = d;
        bestIndex = index;
      }
    });

    const [next] = remaining.splice(bestIndex, 1);
    ordered.push({ ...next, legKm: Math.round(bestDistance * 10) / 10 });
    cursor = next.location;
  }

  return ordered;
};

/** Total straight-line distance of an ordered route. */
export const totalKm = (orderedPlaces) =>
  Math.round(orderedPlaces.reduce((sum, place) => sum + place.legKm, 0) * 10) / 10;

/**
 * A rough time estimate for a day out.
 *
 * Straight-line kilometres understate real roads, especially mountain ones, so
 * a detour factor is applied before assuming an average speed. Plus a flat stop
 * time per place. It is an estimate and the UI labels it as one.
 */
export const estimateHours = (orderedPlaces, { avgSpeedKmh = 50, roadFactor = 1.35, hoursPerStop = 0.5 } = {}) => {
  const driving = (totalKm(orderedPlaces) * roadFactor) / avgSpeedKmh;
  const stops = orderedPlaces.length * hoursPerStop;
  return Math.round((driving + stops) * 10) / 10;
};

const MAX_WAYPOINTS = 8;

/**
 * A Google Maps directions link for the whole route.
 *
 * This is the plain URL scheme, not the paid Directions API - it costs nothing
 * and needs no key. Google caps the waypoint list, so longer routes are
 * truncated rather than silently producing a broken link.
 */
export const googleMapsUrl = (start, orderedPlaces) => {
  if (orderedPlaces.length === 0) return null;

  const coord = ({ lat, lng }) => `${lat},${lng}`;
  const stops = orderedPlaces.slice(0, MAX_WAYPOINTS + 1);
  const destination = stops[stops.length - 1];
  const waypoints = stops.slice(0, -1).map((place) => coord(place.location));

  const params = new URLSearchParams({
    api: "1",
    destination: coord(destination.location),
    travelmode: "driving",
  });
  if (start) params.set("origin", coord(start));
  if (waypoints.length) params.set("waypoints", waypoints.join("|"));

  return `https://www.google.com/maps/dir/?${params.toString()}`;
};
