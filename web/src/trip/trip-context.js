import { createContext, useContext } from "react";

/**
 * The day being planned.
 *
 * Deliberately client-side only: a trip is a scratch list you assemble in a few
 * minutes and act on, not something worth an account or a table. It survives a
 * refresh via localStorage, which is all the persistence it needs.
 */
export const TripContext = createContext({
  places: [],
  add: () => {},
  remove: () => {},
  toggle: () => {},
  clear: () => {},
  has: () => false,
  isFull: false,
});

export const useTrip = () => useContext(TripContext);
