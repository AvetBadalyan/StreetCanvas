import { createContext, useContext } from "react";

/**
 * The signed-in visitor's saved places, held once at the top of the tree.
 *
 * Every card needs to know whether it is saved, and a card must not fetch that
 * for itself - eighty cards would mean eighty requests. The lists are small
 * (tens of ids), so they are loaded once on sign-in and kept as Sets for O(1)
 * lookups during render.
 */
export const SavedContext = createContext({
  visited: new Set(),
  wishlist: new Set(),
  isSaved: () => false,
  toggle: async () => {},
  isReady: false,
});

export const useSaved = () => useContext(SavedContext);
