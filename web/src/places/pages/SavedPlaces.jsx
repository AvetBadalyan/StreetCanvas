import React, { useState, useEffect } from "react";

import { fetchMyLists } from "../../shared/api/lists";
import { useHttpClient } from "../../shared/hooks/http-hook";
import { useAuthContext } from "../../shared/context/auth-context";
import { useSaved } from "../../shared/context/saved-context";
import PlaceGrid from "../components/PlaceGrid/PlaceGrid";
import Button from "../../shared/components/FormElements/Button/Button";
import ErrorModal from "../../shared/components/UIElements/ErrorModal";
import EmptyState from "../../shared/components/UIElements/EmptyState/EmptyState";
import { PlaceGridSkeleton } from "../../shared/components/UIElements/Skeleton/Skeleton";
import "./SavedPlaces.scss";

const TABS = [
  { key: "wishlist", label: "Want to go" },
  { key: "visited", label: "Been there" },
];

/**
 * The visitor's own two lists.
 *
 * Reads the full place records from the API rather than the id Sets held in
 * context: the Sets exist so a card can answer "am I saved?" instantly, but
 * rendering the lists needs the places themselves.
 */
const SavedPlaces = () => {
  const auth = useAuthContext();
  const saved = useSaved();
  const { isLoading, error, run, clearError } = useHttpClient();

  const [lists, setLists] = useState({ visited: [], wishlist: [] });
  const [tab, setTab] = useState("wishlist");

  // `saved` changes whenever a place is added or removed anywhere in the app,
  // which is exactly when this page's contents are stale.
  const savedSignature = `${saved.visited.size}:${saved.wishlist.size}`;

  useEffect(() => {
    if (!auth.token) return;
    const load = async () => {
      try {
        const data = await run((options) => fetchMyLists({ ...options, token: auth.token }));
        setLists(data);
      } catch {
        // Surfaced by the modal.
      }
    };
    load();
  }, [run, auth.token, savedSignature]);

  const places = lists[tab] || [];
  const showSkeleton = isLoading && places.length === 0;

  return (
    <div className="page">
      <ErrorModal error={error} onClear={clearError} />

      <header className="page__header">
        <h1>Your places</h1>
        <p>
          {lists.wishlist.length} to visit · {lists.visited.length} visited
        </p>
      </header>

      <div className="saved-tabs" role="tablist">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            role="tab"
            aria-selected={tab === key}
            className={tab === key ? "is-active" : ""}
            onClick={() => setTab(key)}
          >
            {label}
            <span>{lists[key]?.length ?? 0}</span>
          </button>
        ))}
      </div>

      {showSkeleton && <PlaceGridSkeleton count={3} />}

      {!showSkeleton && places.length === 0 && (
        <EmptyState
          title={
            tab === "wishlist"
              ? "Nothing on your list yet"
              : "You haven't ticked anywhere off yet"
          }
          description={
            tab === "wishlist"
              ? "Browse the catalogue and star the places you want to see."
              : "Mark places as visited as you go, and they'll collect here."
          }
          action={<Button to="/">Explore places</Button>}
        />
      )}

      {places.length > 0 && <PlaceGrid places={places} />}
    </div>
  );
};

export default SavedPlaces;
