import { useState, useEffect } from "react";

/**
 * Delays a rapidly changing value. Used by the explore search box so typing
 * "mural" fires one request instead of five.
 */
export const useDebounce = (value, delay = 350) => {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
};
