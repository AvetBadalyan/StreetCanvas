import React from "react";

import { useTheme } from "../../../context/theme-context";
import "./ThemeToggle.scss";

/**
 * Inline SVG rather than the ☀/☾ characters those started as: the glyphs render
 * at wildly different weights across fonts and platforms, and the moon in
 * particular came out as a hairline that was almost invisible.
 *
 * `currentColor` means the icon inherits the button's colour, so it stays legible
 * in both themes without a second rule.
 */
const SunIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
    <circle cx="12" cy="12" r="4.5" fill="currentColor" />
    <g stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <line x1="12" y1="1.8" x2="12" y2="4" />
      <line x1="12" y1="20" x2="12" y2="22.2" />
      <line x1="1.8" y1="12" x2="4" y2="12" />
      <line x1="20" y1="12" x2="22.2" y2="12" />
      <line x1="4.6" y1="4.6" x2="6.2" y2="6.2" />
      <line x1="17.8" y1="17.8" x2="19.4" y2="19.4" />
      <line x1="4.6" y1="19.4" x2="6.2" y2="17.8" />
      <line x1="17.8" y1="6.2" x2="19.4" y2="4.6" />
    </g>
  </svg>
);

const MoonIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
    <path
      d="M20.5 14.6A8.6 8.6 0 0 1 9.4 3.5a8.6 8.6 0 1 0 11.1 11.1Z"
      fill="currentColor"
    />
  </svg>
);

const ThemeToggle = () => {
  const { theme, toggleTheme } = useTheme();
  const goingTo = theme === "dark" ? "light" : "dark";

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={toggleTheme}
      // The icon alone carries no meaning to a screen reader, so the button
      // says what pressing it will do.
      aria-label={`Switch to ${goingTo} theme`}
      title={`Switch to ${goingTo} theme`}
    >
      {theme === "dark" ? <SunIcon /> : <MoonIcon />}
    </button>
  );
};

export default ThemeToggle;
