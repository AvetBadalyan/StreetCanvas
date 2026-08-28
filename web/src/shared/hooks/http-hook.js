import { useState, useCallback, useRef, useEffect } from "react";

import { ApiError, NetworkError } from "../api/client";

/**
 * Turns a thrown error into something worth showing a visitor. A bare
 * "Failed to fetch" - which is what the browser gives you and what this app
 * used to display verbatim - tells them nothing and looks broken.
 */
const messageFor = (err) => {
  if (err instanceof NetworkError) {
    return "We could not reach the server. It may be waking up from sleep - give it a moment and try again.";
  }
  if (err instanceof ApiError) {
    if (err.status === 429) {
      return "That is a lot of requests in a short time. Please wait a minute.";
    }
    if (err.status >= 500) {
      return "The server ran into a problem. Please try again shortly.";
    }
    return err.message;
  }
  return err?.message || "Something went wrong.";
};

/**
 * Wraps an async API call with loading and error state, and aborts anything
 * still in flight when the component unmounts.
 */
export const useHttpClient = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const activeControllers = useRef([]);

  useEffect(
    () => () => {
      // Unmounting aborts every in-flight request, which is what stops the
      // state setters below from ever running on a dead component: the catch
      // returns early on AbortError, and React 18 no longer warns about the
      // setState in `finally`.
      activeControllers.current.forEach((controller) => controller.abort());
      activeControllers.current = [];
    },
    []
  );

  const run = useCallback(async (task) => {
    const controller = new AbortController();
    activeControllers.current.push(controller);

    setIsLoading(true);
    setError(null);

    try {
      return await task({ signal: controller.signal });
    } catch (err) {
      // An abort is a deliberate teardown, not a failure to report.
      if (err.name !== "AbortError") {
        setError(messageFor(err));
      }
      throw err;
    } finally {
      activeControllers.current = activeControllers.current.filter(
        (item) => item !== controller
      );
      setIsLoading(false);
    }
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return { isLoading, error, run, clearError };
};
