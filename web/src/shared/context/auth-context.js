import { createContext, useContext } from "react";

export const AuthContext = createContext({
  isLoggedIn: false,
  userId: null,
  user: null,
  token: null,
  isRestoring: true,
  login: () => {},
  logout: () => {},
});

export const useAuth = () => useContext(AuthContext);
