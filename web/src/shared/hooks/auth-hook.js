import { useState, useCallback, useEffect, useRef } from "react";

const STORAGE_KEY = "wanderarmenia.auth";
// Must stay in step with the API's token TTL.
const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export const useAuthState = () => {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [expiresAt, setExpiresAt] = useState(null);
  // Distinguishes "not signed in" from "not yet read from localStorage", so
  // guarded routes do not bounce a returning visitor to the login page during
  // the first render.
  const [isRestoring, setIsRestoring] = useState(true);

  const logoutTimer = useRef();

  // A restored session passes its stored expiry; a fresh sign-in gets a new one.
  const login = useCallback((userData, authToken, expiresAt = new Date(Date.now() + TOKEN_TTL_MS)) => {
    setToken(authToken);
    setUser(userData);
    setExpiresAt(expiresAt);

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        user: userData,
        token: authToken,
        expiresAt: expiresAt.toISOString(),
      })
    );
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    setExpiresAt(null);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  // Sign the user out exactly when the token stops being accepted, rather than
  // letting them hit a wall of 401s.
  useEffect(() => {
    clearTimeout(logoutTimer.current);
    if (token && expiresAt) {
      const remaining = expiresAt.getTime() - Date.now();
      if (remaining <= 0) {
        logout();
      } else {
        logoutTimer.current = setTimeout(logout, remaining);
      }
    }
    return () => clearTimeout(logoutTimer.current);
  }, [token, expiresAt, logout]);

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (stored?.token && new Date(stored.expiresAt) > new Date()) {
        login(stored.user, stored.token, new Date(stored.expiresAt));
      } else if (stored) {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      // Corrupt or partially written entry - start clean rather than crash the
      // whole app on boot.
      localStorage.removeItem(STORAGE_KEY);
    }
    setIsRestoring(false);
  }, [login]);

  return { token, user, userId: user?.userId ?? null, login, logout, isRestoring };
};
