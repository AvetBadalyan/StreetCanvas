import { useCallback, useMemo, useState } from "react";

/**
 * The browser's own geolocation, asked for only when the visitor clicks.
 *
 * Deliberately not requested on mount: an unprompted permission dialog on page
 * load is hostile, and browsers increasingly ignore it anyway. The visitor
 * presses "Near me" and the request is then obviously connected to what they
 * asked for.
 *
 * Free and built in - no API key, no third-party service.
 */
export const useGeolocation = () => {
  const [position, setPosition] = useState(null);
  const [status, setStatus] = useState("idle"); // idle | locating | ready | error
  const [error, setError] = useState(null);

  const locate = useCallback(
    () =>
      new Promise((resolve) => {
        if (!navigator.geolocation) {
          setStatus("error");
          setError("This browser cannot share your location.");
          return resolve(null);
        }

        setStatus("locating");
        setError(null);

        navigator.geolocation.getCurrentPosition(
          ({ coords }) => {
            const next = { lat: coords.latitude, lng: coords.longitude };
            setPosition(next);
            setStatus("ready");
            resolve(next);
          },
          (err) => {
            // The browser's own messages are cryptic; say what actually happened
            // and, where relevant, what the visitor can do about it.
            const messages = {
              1: "Location permission was denied. You can allow it in your browser's address bar.",
              2: "Your location is unavailable right now.",
              3: "Finding your location took too long.",
            };
            setStatus("error");
            setError(messages[err.code] || "Could not get your location.");
            resolve(null);
          },
          { enableHighAccuracy: false, timeout: 10000, maximumAge: 5 * 60 * 1000 }
        );
      }),
    []
  );

  const clear = useCallback(() => {
    setPosition(null);
    setStatus("idle");
    setError(null);
  }, []);

  // Memoized like the other stateful hooks App.jsx feeds into context, so a
  // re-render of App does not hand LocationContext a new object identity.
  return useMemo(
    () => ({ position, status, error, locate, clear }),
    [position, status, error, locate, clear]
  );
};
