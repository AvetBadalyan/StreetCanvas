import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";

import { fetchArtworks, fetchFacets } from "../../shared/api/artworks";
import { useHttpClient } from "../../shared/hooks/http-hook";
import { useDebounce } from "../../shared/hooks/use-debounce";
import { useAuthContext } from "../../shared/context/auth-context";
import { useServerStatusContext } from "../../shared/context/server-context";
import ArtworkFilters from "../components/ArtworkFilters/ArtworkFilters";
import ArtworkGrid from "../components/ArtworkGrid/ArtworkGrid";
import Map from "../../shared/components/UIElements/Map/Map";
import Pagination from "../../shared/components/UIElements/Pagination/Pagination";
import Button from "../../shared/components/FormElements/Button/Button";
import ErrorModal from "../../shared/components/UIElements/ErrorModal";
import EmptyState from "../../shared/components/UIElements/EmptyState/EmptyState";
import { ArtworkGridSkeleton } from "../../shared/components/UIElements/Skeleton/Skeleton";
import "./Explore.scss";

const PAGE_SIZE = 12;

/**
 * The public feed.
 *
 * Filter state lives in the URL rather than in component state, so a filtered
 * view can be linked, bookmarked and restored with the back button.
 */
const Explore = () => {
  const auth = useAuthContext();
  const { isReady } = useServerStatusContext();
  const [searchParams, setSearchParams] = useSearchParams();

  const { isLoading, error, run, clearError } = useHttpClient();
  const [artworks, setArtworks] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [facets, setFacets] = useState({ tags: [], forms: [], total: 0 });
  const [view, setView] = useState("grid");

  const filters = useMemo(
    () => ({
      q: searchParams.get("q") || "",
      tag: searchParams.get("tag") || "",
      form: searchParams.get("form") || "",
      sort: searchParams.get("sort") || "recent",
      page: Number(searchParams.get("page")) || 1,
    }),
    [searchParams]
  );

  // Typing should not fire a request per keystroke, but changing a dropdown
  // should feel instant - so only the free-text term is debounced.
  const debouncedQuery = useDebounce(filters.q, 350);

  const applyFilters = useCallback(
    (next) => {
      const params = {};
      Object.entries(next).forEach(([key, value]) => {
        // Keep the URL clean: omit empty values and the default sort/page.
        if (!value) return;
        if (key === "sort" && value === "recent") return;
        if (key === "page" && Number(value) === 1) return;
        params[key] = String(value);
      });
      setSearchParams(params, { replace: true });
    },
    [setSearchParams]
  );

  useEffect(() => {
    // Nothing to gain from firing at a server we know is still booting - the
    // banner is already explaining the wait.
    if (!isReady) return;

    const load = async () => {
      try {
        const data = await run((options) =>
          fetchArtworks(
            {
              q: debouncedQuery,
              tag: filters.tag,
              form: filters.form,
              sort: filters.sort,
              page: filters.page,
              limit: PAGE_SIZE,
            },
            options
          )
        );
        setArtworks(data.artworks);
        setPagination(data.pagination);
      } catch {
        // Surfaced by the error modal.
      }
    };
    load();
  }, [
    run,
    isReady,
    debouncedQuery,
    filters.tag,
    filters.form,
    filters.sort,
    filters.page,
  ]);

  // Facet counts only change when content does, so they are fetched once rather
  // than alongside every filter change.
  useEffect(() => {
    if (!isReady) return;
    fetchFacets()
      .then(setFacets)
      .catch(() => setFacets({ tags: [], forms: [], total: 0 }));
  }, [isReady]);

  const handleDeleted = (deletedId) => {
    setArtworks((current) => current.filter((item) => item.id !== deletedId));
    setPagination((current) =>
      current ? { ...current, total: Math.max(0, current.total - 1) } : current
    );
  };

  // One definition of "cleared", used by both the filter bar and the empty
  // state, so the two buttons cannot reset to different things.
  const clearFilters = useCallback(
    () => applyFilters({ sort: filters.sort }),
    [applyFilters, filters.sort]
  );

  // Rebuilding this array every render would make the map tear down and refit
  // all of its markers on each keystroke, since Map keys its effect on identity.
  const markers = useMemo(
    () =>
      artworks
        .filter((artwork) => artwork.location)
        .map((artwork) => ({
          id: artwork.id,
          lat: artwork.location.lat,
          lng: artwork.location.lng,
          title: artwork.title,
          subtitle: artwork.address,
        })),
    [artworks]
  );

  const hasFilters = Boolean(filters.q || filters.tag || filters.form);
  // Also skeleton while the API is still waking, otherwise an empty list looks
  // like "no results" before a single request has even been sent.
  const showSkeleton = (isLoading || !isReady) && artworks.length === 0;

  return (
    <div className="page">
      <ErrorModal error={error} onClear={clearError} />

      <header className="page__header explore__header">
        <div>
          <h1>The art you walk past every day</h1>
          <p>
            {facets.total > 0
              ? `${facets.total} sculptures, murals, monuments and fountains from public spaces around the world - each with its artist, its date and the story behind it.`
              : "An atlas of public art: sculptures, murals, monuments and fountains from streets and squares around the world."}
          </p>
        </div>
        {auth.isLoggedIn && (
          <Button to="/artworks/new" size="large">
            Add a find
          </Button>
        )}
      </header>

      <ArtworkFilters
        filters={filters}
        facets={facets}
        onChange={applyFilters}
        onClearFilters={clearFilters}
        view={view}
        onViewChange={setView}
        resultCount={pagination?.total ?? null}
      />

      {showSkeleton && <ArtworkGridSkeleton count={PAGE_SIZE} />}

      {!showSkeleton && artworks.length === 0 && (
        <EmptyState
          title={hasFilters ? "Nothing matches those filters" : "No finds yet"}
          description={
            hasFilters
              ? "Try a broader search, or clear the filters to see everything."
              : "Be the first to pin a piece of street art to the map."
          }
          action={
            hasFilters ? (
              <Button variant="ghost" onClick={clearFilters}>
                Clear filters
              </Button>
            ) : (
              <Button to={auth.isLoggedIn ? "/artworks/new" : "/auth"}>
                {auth.isLoggedIn ? "Add the first find" : "Sign in to contribute"}
              </Button>
            )
          }
        />
      )}

      {!showSkeleton && artworks.length > 0 && view === "grid" && (
        <ArtworkGrid
          artworks={artworks}
          onDeleted={handleDeleted}
          onSelectTag={(tag) => applyFilters({ ...filters, tag, page: 1 })}
        />
      )}

      {!showSkeleton && artworks.length > 0 && view === "map" && (
        <div className="explore__map">
          <Map markers={markers} />
        </div>
      )}

      {view === "grid" && (
        <Pagination
          pagination={pagination}
          onChange={(page) => applyFilters({ ...filters, page })}
        />
      )}
    </div>
  );
};

export default Explore;
