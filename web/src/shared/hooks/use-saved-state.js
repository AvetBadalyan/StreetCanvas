import { useCallback, useEffect, useMemo, useState } from "react";

import { fetchMyLists, addToList, removeFromList } from "../api/lists";

const EMPTY = { visited: new Set(), wishlist: new Set() };

/**
 * Loads and mutates the visitor's "visited" and "want to go" lists.
 *
 * Updates optimistically: a save should feel instant, and the request behind it
 * is a single boolean flip that either succeeds or is retried by the visitor
 * pressing again. On failure the previous state is put back, so the UI never
 * quietly disagrees with the server.
 */
export const useSavedState = ({ token, isLoggedIn }) => {
  const [lists, setLists] = useState(EMPTY);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!isLoggedIn) {
      setLists(EMPTY);
      setIsReady(false);
      return;
    }

    let cancelled = false;
    fetchMyLists({ token })
      .then((data) => {
        if (cancelled) return;
        setLists({
          visited: new Set(data.visited.map((p) => p.id)),
          wishlist: new Set(data.wishlist.map((p) => p.id)),
        });
        setIsReady(true);
      })
      .catch(() => {
        // Saved lists are an enhancement; the catalogue works without them.
        if (!cancelled) setIsReady(true);
      });

    return () => {
      cancelled = true;
    };
  }, [token, isLoggedIn]);

  const isSaved = useCallback(
    (list, placeId) => lists[list]?.has(placeId) ?? false,
    [lists]
  );

  const toggle = useCallback(
    async (list, placeId) => {
      const other = list === "visited" ? "wishlist" : "visited";
      const wasSaved = lists[list].has(placeId);
      const previous = lists;

      // Mirror the server's rule locally: saving to one list clears the other.
      const next = {
        visited: new Set(lists.visited),
        wishlist: new Set(lists.wishlist),
      };
      if (wasSaved) {
        next[list].delete(placeId);
      } else {
        next[list].add(placeId);
        next[other].delete(placeId);
      }
      setLists(next);

      try {
        await (wasSaved
          ? removeFromList(list, placeId, { token })
          : addToList(list, placeId, { token }));
      } catch {
        setLists(previous);
      }
    },
    [lists, token]
  );

  return useMemo(
    () => ({ ...lists, isSaved, toggle, isReady }),
    [lists, isSaved, toggle, isReady]
  );
};
