import React, { useMemo } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import { AuthContext } from "./shared/context/auth-context";
import { ServerStatusContext } from "./shared/context/server-context";
import { ThemeContext } from "./shared/context/theme-context";
import { LocationContext } from "./shared/context/location-context";
import { SavedContext } from "./shared/context/saved-context";
import { TripContext } from "./trip/trip-context";

import { useAuth } from "./shared/hooks/auth-hook";
import { useServerStatus } from "./shared/hooks/use-server-status";
import { useTheme } from "./shared/hooks/use-theme";
import { useGeolocation } from "./shared/hooks/use-geolocation";
import { useSavedState } from "./shared/hooks/use-saved-state";
import { useTripState } from "./trip/use-trip-state";

import MainNavigation from "./shared/components/Navigation/MainNavigation/MainNavigation";
import SiteFooter from "./shared/components/Navigation/SiteFooter/SiteFooter";
import ServerStatusBanner from "./shared/components/UIElements/ServerStatus/ServerStatusBanner";
import TripBar from "./trip/TripBar";
import Explore from "./places/pages/Explore";
import NewPlace from "./places/pages/NewPlace";
import EditPlace from "./places/pages/EditPlace";
import SavedPlaces from "./places/pages/SavedPlaces";
import ContributorPlaces from "./places/pages/ContributorPlaces";
import Contributors from "./user/pages/Contributors";
import Auth from "./user/pages/Auth/Auth";

/** Sends signed-out visitors to the auth page. */
const RequireAuth = ({ token, isRestoring, children }) => {
  // Wait for localStorage to be read before redirecting, otherwise a returning
  // visitor is bounced to the login page on every refresh.
  if (isRestoring) return null;
  return token ? children : <Navigate to="/auth" replace />;
};

const App = () => {
  const { token, user, userId, login, logout, isRestoring } = useAuth();
  const { status, elapsed, retry } = useServerStatus();
  const { theme, toggleTheme, isExplicit } = useTheme();
  const geo = useGeolocation();
  const trip = useTripState();
  const saved = useSavedState({ token, isLoggedIn: !!token });

  // Each provider gets a stable value so a re-render of App does not force
  // every consumer to re-render with it.
  const authValue = useMemo(
    () => ({
      isLoggedIn: !!token,
      token,
      user,
      userId,
      isRestoring,
      login,
      logout,
    }),
    [token, user, userId, isRestoring, login, logout]
  );

  const serverValue = useMemo(
    () => ({ status, elapsed, isReady: status === "ready", retry }),
    [status, elapsed, retry]
  );

  const themeValue = useMemo(
    () => ({ theme, toggleTheme, isExplicit }),
    [theme, toggleTheme, isExplicit]
  );

  return (
    <ThemeContext.Provider value={themeValue}>
      <AuthContext.Provider value={authValue}>
        <ServerStatusContext.Provider value={serverValue}>
          <LocationContext.Provider value={geo}>
            <SavedContext.Provider value={saved}>
              <TripContext.Provider value={trip}>
                <BrowserRouter>
                  <MainNavigation />
                  <ServerStatusBanner />
                  <main>
                    <Routes>
                      <Route path="/" element={<Explore />} />
                      <Route path="/contributors" element={<Contributors />} />
                      <Route
                        path="/contributors/:userId"
                        element={<ContributorPlaces />}
                      />
                      <Route
                        path="/saved"
                        element={
                          <RequireAuth token={token} isRestoring={isRestoring}>
                            <SavedPlaces />
                          </RequireAuth>
                        }
                      />
                      <Route
                        path="/places/new"
                        element={
                          <RequireAuth token={token} isRestoring={isRestoring}>
                            <NewPlace />
                          </RequireAuth>
                        }
                      />
                      <Route
                        path="/places/:placeId/edit"
                        element={
                          <RequireAuth token={token} isRestoring={isRestoring}>
                            <EditPlace />
                          </RequireAuth>
                        }
                      />
                      <Route
                        path="/auth"
                        element={!token ? <Auth /> : <Navigate to="/" replace />}
                      />
                      {/* Anything else is a typo or a dead bookmark. */}
                      <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                  </main>
                  <SiteFooter />
                  {/* Fixed to the bottom, so it sits outside <main>. */}
                  <TripBar startPoint={geo.position} />
                </BrowserRouter>
              </TripContext.Provider>
            </SavedContext.Provider>
          </LocationContext.Provider>
        </ServerStatusContext.Provider>
      </AuthContext.Provider>
    </ThemeContext.Provider>
  );
};

export default App;
