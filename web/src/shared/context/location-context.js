import { createContext, useContext } from "react";

/**
 * The visitor's location, asked for once and shared.
 *
 * Two features need it - "near me" on the catalogue, and the starting point for
 * the planned day - and prompting twice for the same permission would be
 * obnoxious. Held at the top of the tree so the permission is requested at most
 * once per visit.
 */
export const LocationContext = createContext({
  position: null,
  status: "idle",
  error: null,
  locate: async () => null,
  clear: () => {},
});

export const useLocation = () => useContext(LocationContext);
