import { useState, useEffect } from "react";

/**
 * Delays a rapidly changing value. Used by the explore search box so typing
 * "monastery" fires one request instead of nine.
 */
export const useDebounce = (value, delay = 350) => {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
};
