import { useCallback, useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "wander.trip";

// More than this stops being a day out, and Google Maps will not accept an
// unbounded waypoint list either. Consumers read `isFull` rather than this.
const MAX_STOPS = 9;

const load = () => {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
};

/**
 * Owns the list of places in the current trip.
 *
 * Stores whole place objects rather than ids, so the trip panel can render
 * without refetching - the visitor has already seen this data, and a trip is at
 * most nine items.
 */
export const useTripState = () => {
  const [places, setPlaces] = useState(load);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(places));
    } catch {
      // A trip that does not survive a refresh is a small loss; failing the
      // interaction over it would be a bigger one.
    }
  }, [places]);

  const has = useCallback(
    (id) => places.some((place) => place.id === id),
    [places]
  );

  const add = useCallback((place) => {
    setPlaces((current) =>
      current.some((existing) => existing.id === place.id) ||
      current.length >= MAX_STOPS
        ? current
        : [...current, place]
    );
  }, []);

  const remove = useCallback((id) => {
    setPlaces((current) => current.filter((place) => place.id !== id));
  }, []);

  const toggle = useCallback((place) => {
    setPlaces((current) => {
      if (current.some((existing) => existing.id === place.id)) {
        return current.filter((existing) => existing.id !== place.id);
      }
      return current.length >= MAX_STOPS ? current : [...current, place];
    });
  }, []);

  const clear = useCallback(() => setPlaces([]), []);

  return useMemo(
    () => ({
      places,
      add,
      remove,
      toggle,
      clear,
      has,
      isFull: places.length >= MAX_STOPS,
    }),
    [places, add, remove, toggle, clear, has]
  );
};
