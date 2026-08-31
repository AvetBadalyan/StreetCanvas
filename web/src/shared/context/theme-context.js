import { createContext, useContext } from "react";

/**
 * The active theme and a way to flip it.
 *
 * Held in context because the toggle lives in the navigation while the theme
 * itself is applied to <html>, and other components (the map, for one) need to
 * know which is active.
 */
export const ThemeContext = createContext({
  theme: "dark",
  toggleTheme: () => {},
  isExplicit: false,
});

export const useThemeContext = () => useContext(ThemeContext);
