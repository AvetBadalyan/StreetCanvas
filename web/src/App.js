import React from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import { AuthContext } from "./shared/context/auth-context";
import { ServerStatusContext } from "./shared/context/server-context";
import { useAuth } from "./shared/hooks/auth-hook";
import { useServerStatus } from "./shared/hooks/use-server-status";
import MainNavigation from "./shared/components/Navigation/MainNavigation/MainNavigation";
import SiteFooter from "./shared/components/Navigation/SiteFooter/SiteFooter";
import ServerStatusBanner from "./shared/components/UIElements/ServerStatus/ServerStatusBanner";
import Explore from "./artworks/pages/Explore";
import NewArtwork from "./artworks/pages/NewArtwork";
import EditArtwork from "./artworks/pages/EditArtwork";
import ContributorArtworks from "./artworks/pages/ContributorArtworks";
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

  return (
    <AuthContext.Provider
      value={{
        isLoggedIn: !!token,
        token,
        user,
        userId,
        isRestoring,
        login,
        logout,
      }}
    >
      {/*
        The page renders straight away even while the API is still waking up.
        Pages hold their first request until `isReady`, and the banner explains
        the wait - so a cold start costs a skeleton, not an error dialog, and a
        warm one costs nothing at all.
      */}
      <ServerStatusContext.Provider
        value={{ status, elapsed, isReady: status === "ready", retry }}
      >
        <BrowserRouter>
          <MainNavigation />
          <ServerStatusBanner />
          <main>
            <Routes>
              <Route path="/" element={<Explore />} />
              <Route path="/contributors" element={<Contributors />} />
              <Route
                path="/contributors/:userId"
                element={<ContributorArtworks />}
              />
              <Route
                path="/artworks/new"
                element={
                  <RequireAuth token={token} isRestoring={isRestoring}>
                    <NewArtwork />
                  </RequireAuth>
                }
              />
              <Route
                path="/artworks/:artworkId/edit"
                element={
                  <RequireAuth token={token} isRestoring={isRestoring}>
                    <EditArtwork />
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
        </BrowserRouter>
      </ServerStatusContext.Provider>
    </AuthContext.Provider>
  );
};

export default App;
