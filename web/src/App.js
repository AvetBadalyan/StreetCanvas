import React from "react";

import Users from "./user/pages/Users";
import NewPlace from "./places/pages/NewPlace";
import UserPlaces from "./places/pages/UserPlaces";
import UpdatePlace from "./places/pages/UpdatePlace";
import MainNavigation from "./shared/components/Navigation/MainNavigation/MainNavigation";
import { AuthContext } from "./shared/context/auth-context";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./shared/hooks/auth-hook";
import Auth from "./user/pages/Auth/Auth";

const App = () => {
  const { token, login, logout, userId } = useAuth();

  return (
    <AuthContext.Provider
      value={{
        isLoggedIn: !!token,
        token: token,
        userId: userId,
        login: login,
        logout: logout,
      }}
    >
      <BrowserRouter>
        <MainNavigation />
        <main>
          <Routes>
            <Route path="/" element={<Users />} />
            <Route path="/:userId/places" element={<UserPlaces />} />
            <Route
              path="/places/new"
              element={token ? <NewPlace /> : <Navigate to="/auth" />}
            />
            <Route
              path="/places/:placeId"
              element={token ? <UpdatePlace /> : <Navigate to="/auth" />}
            />
            <Route
              path="/auth"
              element={!token ? <Auth /> : <Navigate to="/" />}
            />
          </Routes>
        </main>
      </BrowserRouter>
    </AuthContext.Provider>
  );
};

export default App;
