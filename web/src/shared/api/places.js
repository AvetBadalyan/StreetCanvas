import { request, buildQuery } from "./client";

export const fetchPlaces = (params, options) =>
  request(`/places${buildQuery(params)}`, options);

export const fetchFacets = (options) => request("/places/facets", options);

export const fetchPlace = (id, options) => request(`/places/${id}`, options);

export const fetchPlacesByUser = (userId, { page, limit, ...options } = {}) =>
  request(`/places/user/${userId}${buildQuery({ page, limit })}`, options);

export const createPlace = (formData, options) =>
  request("/places", { ...options, method: "POST", body: formData });

export const updatePlace = (id, data, options) =>
  request(`/places/${id}`, { ...options, method: "PATCH", body: data });

export const deletePlace = (id, options) =>
  request(`/places/${id}`, { ...options, method: "DELETE" });
