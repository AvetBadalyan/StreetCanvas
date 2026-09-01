import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "wander.theme";

/** Reads the saved choice, or null when the visitor has never chosen. */
const storedTheme = () => {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === "light" || value === "dark" ? value : null;
  } catch {
    // Private browsing can make localStorage throw on read.
    return null;
  }
};

const systemTheme = () =>
  window.matchMedia?.("(prefers-color-scheme: light)").matches ? "light" : "dark";

/**
 * Light/dark theme, persisted across visits.
 *
 * Only writes `data-theme` to <html> once the visitor has actually chosen. Until
 * then the attribute is absent, which lets the stylesheet fall through to
 * `prefers-color-scheme` and follow the operating system - including if the OS
 * switches while the tab is open.
 */
export const useThemeState = () => {
  const [choice, setChoice] = useState(storedTheme);
  const [systemPreference, setSystemPreference] = useState(systemTheme);

  // Track the OS setting so the toggle button shows what is actually on screen.
  useEffect(() => {
    const media = window.matchMedia?.("(prefers-color-scheme: light)");
    if (!media) return;
    const onChange = (event) => setSystemPreference(event.matches ? "light" : "dark");
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (choice) {
      root.setAttribute("data-theme", choice);
    } else {
      root.removeAttribute("data-theme");
    }
  }, [choice]);

  const theme = choice ?? systemPreference;

  const toggleTheme = useCallback(() => {
    setChoice((current) => {
      const next = (current ?? systemTheme()) === "dark" ? "light" : "dark";
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch {
        // Not being able to remember the choice is not worth failing over.
      }
      return next;
    });
  }, []);

  return { theme, toggleTheme, isExplicit: choice !== null };
};
