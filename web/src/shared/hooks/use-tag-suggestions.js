import { useState, useEffect } from "react";

import { fetchFacets } from "../api/places";

/**
 * The most-used tags, offered as one-click suggestions in the tag editor.
 *
 * Suggestions are a nicety: if the request fails the form still works, so this
 * deliberately swallows the error rather than surfacing one.
 */
export const useTagSuggestions = () => {
  const [suggestions, setSuggestions] = useState([]);

  useEffect(() => {
    let cancelled = false;

    fetchFacets()
      .then((data) => {
        if (!cancelled) setSuggestions(data.tags.map((facet) => facet.tag));
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

  return suggestions;
};
