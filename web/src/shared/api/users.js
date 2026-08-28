import { request } from "./client";

export const fetchContributors = (options) => request("/users", options);

export const login = (credentials, options) =>
  request("/users/login", { ...options, method: "POST", body: credentials });

export const signup = (formData, options) =>
  request("/users/signup", { ...options, method: "POST", body: formData });
