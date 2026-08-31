import { request } from "./client";

/** The signed-in visitor's saved places. */
export const fetchMyLists = (options) => request("/me/lists", options);

/** `list` is "visited" or "wishlist". Saving to one removes it from the other. */
export const addToList = (list, placeId, options) =>
  request(`/me/lists/${list}/${placeId}`, { ...options, method: "PUT" });

export const removeFromList = (list, placeId, options) =>
  request(`/me/lists/${list}/${placeId}`, { ...options, method: "DELETE" });
