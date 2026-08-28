import { request, buildQuery } from "./client";

export const fetchArtworks = (params, options) =>
  request(`/artworks${buildQuery(params)}`, options);

export const fetchFacets = (options) => request("/artworks/facets", options);

export const fetchArtwork = (id, options) =>
  request(`/artworks/${id}`, options);

export const fetchArtworksByUser = (userId, { page, limit, ...options } = {}) =>
  request(`/artworks/user/${userId}${buildQuery({ page, limit })}`, options);

export const createArtwork = (formData, options) =>
  request("/artworks", { ...options, method: "POST", body: formData });

export const updateArtwork = (id, data, options) =>
  request(`/artworks/${id}`, { ...options, method: "PATCH", body: data });

export const deleteArtwork = (id, options) =>
  request(`/artworks/${id}`, { ...options, method: "DELETE" });
