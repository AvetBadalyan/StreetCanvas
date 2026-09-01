import { createContext, useContext } from "react";

/**
 * Whether the API is up.
 *
 * Pages read `isReady` and hold their first request until it is true, so a
 * cold start shows a skeleton and an explanatory banner instead of a wall of
 * failed requests.
 */
export const ServerStatusContext = createContext({
  status: "checking",
  elapsed: 0,
  isReady: false,
  retry: () => {},
});

export const useServerStatus = () => useContext(ServerStatusContext);
