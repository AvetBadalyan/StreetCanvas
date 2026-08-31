import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";

import { fetchPlaces, fetchFacets } from "../../shared/api/places";
import { useHttpClient } from "../../shared/hooks/http-hook";
import { useDebounce } from "../../shared/hooks/use-debounce";
import { useAuthContext } from "../../shared/context/auth-context";
import { useServerStatusContext } from "../../shared/context/server-context";
import { useLocation } from "../../shared/context/location-context";
import PlaceFilters from "../components/PlaceFilters/PlaceFilters";
import PlaceGrid from "../components/PlaceGrid/PlaceGrid";
import Map from "../../shared/components/UIElements/Map/Map";
import Pagination from "../../shared/components/UIElements/Pagination/Pagination";
import Button from "../../shared/components/FormElements/Button/Button";
import ErrorModal from "../../shared/components/UIElements/ErrorModal";
import EmptyState from "../../shared/components/UIElements/EmptyState/EmptyState";
import { PlaceGridSkeleton } from "../../shared/components/UIElements/Skeleton/Skeleton";
import "./Explore.scss";

const PAGE_SIZE = 12;

/**
 * The catalogue.
 *
 * Filter state lives in the URL rather than in component state, so a filtered
 * view can be linked, bookmarked and restored with the back button.
 */
const Explore = () => {
  const auth = useAuthContext();
  const { isReady } = useServerStatusContext();
  const geo = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  const { isLoading, error, run, clearError } = useHttpClient();
  const [places, setPlaces] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [facets, setFacets] = useState({ tags: [], categories: [], regions: [], total: 0 });
  const [view, setView] = useState("grid");

  const filters = useMemo(
    () => ({
      q: searchParams.get("q") || "",
      tag: searchParams.get("tag") || "",
      category: searchParams.get("category") || "",
      sort: searchParams.get("sort") || "recent",
      radius: Number(searchParams.get("radius")) || 25,
      page: Number(searchParams.get("page")) || 1,
    }),
    [searchParams]
  );

  // "near me" is on when the URL says so *and* we actually have coordinates.
  // Keeping the intent in the URL means a refresh does not silently drop it,
  // while the coordinates stay out of the address bar.
  const wantsNearby = searchParams.get("near") === "me";
  const isNearby = wantsNearby && !!geo.position;

  // Typing should not fire a request per keystroke, but changing a dropdown
  // should feel instant - so only the free-text term is debounced.
  const debouncedQuery = useDebounce(filters.q, 350);

  const applyFilters = useCallback(
    (next, { nearby = wantsNearby } = {}) => {
      const params = {};
      Object.entries(next).forEach(([key, value]) => {
        // Keep the URL clean: omit empty values and defaults.
        if (!value) return;
        if (key === "sort" && value === "recent") return;
        if (key === "page" && Number(value) === 1) return;
        if (key === "radius" && Number(value) === 25) return;
        params[key] = String(value);
      });
      if (nearby) params.near = "me";
      setSearchParams(params, { replace: true });
    },
    [setSearchParams, wantsNearby]
  );

  useEffect(() => {
    if (!isReady) return;

    const load = async () => {
      try {
        const data = await run((options) =>
          fetchPlaces(
            {
              q: debouncedQuery,
              tag: filters.tag,
              category: filters.category,
              page: filters.page,
              limit: PAGE_SIZE,
              // Distance ordering replaces the sort, so only one is ever sent.
              ...(isNearby
                ? {
                    near: `${geo.position.lat},${geo.position.lng}`,
                    radius: filters.radius,
                  }
                : { sort: filters.sort }),
            },
            options
          )
        );
        setPlaces(data.places);
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
    filters.category,
    filters.sort,
    filters.page,
    filters.radius,
    isNearby,
    geo.position,
  ]);

  // Facet counts only change when content does, so they are fetched once.
  useEffect(() => {
    if (!isReady) return;
    fetchFacets()
      .then(setFacets)
      .catch(() => setFacets({ tags: [], categories: [], regions: [], total: 0 }));
  }, [isReady]);

  const handleDeleted = (deletedId) => {
    setPlaces((current) => current.filter((item) => item.id !== deletedId));
    setPagination((current) =>
      current ? { ...current, total: Math.max(0, current.total - 1) } : current
    );
  };

  const clearFilters = useCallback(
    () => applyFilters({ sort: filters.sort }, { nearby: false }),
    [applyFilters, filters.sort]
  );

  /** Asks for permission the first time, then toggles the filter. */
  const toggleNearby = useCallback(async () => {
    if (wantsNearby) {
      applyFilters({ ...filters, page: 1 }, { nearby: false });
      return;
    }
    const position = geo.position || (await geo.locate());
    if (position) applyFilters({ ...filters, page: 1 }, { nearby: true });
  }, [wantsNearby, geo, applyFilters, filters]);

  // Rebuilding this array every render would make the map tear down and refit
  // all of its markers on each keystroke, since Map keys its effect on identity.
  const markers = useMemo(
    () =>
      places
        .filter((place) => place.location)
        .map((place) => ({
          id: place.id,
          lat: place.location.lat,
          lng: place.location.lng,
          title: place.title,
          subtitle: place.region,
        })),
    [places]
  );

  const hasFilters = Boolean(filters.q || filters.tag || filters.category || isNearby);
  const showSkeleton = (isLoading || !isReady) && places.length === 0;

  return (
    <div className="page">
      <ErrorModal error={error} onClear={clearError} />

      <header className="page__header explore__header">
        <div>
          <h1>Find your next day out in Armenia</h1>
          <p>
            {facets.total > 0
              ? `${facets.total} monasteries, fortresses, museums and mountains — search them, see what is near you, and build a day around them.`
              : "Monasteries, fortresses, museums and mountains across Armenia."}
          </p>
        </div>
        {auth.isLoggedIn && (
          <Button to="/places/new" size="large">
            Add a place
          </Button>
        )}
      </header>

      <PlaceFilters
        filters={filters}
        facets={facets}
        onChange={applyFilters}
        onClearFilters={clearFilters}
        view={view}
        onViewChange={setView}
        resultCount={pagination?.total ?? null}
        nearby={{
          isActive: isNearby,
          status: geo.status,
          error: wantsNearby ? geo.error : null,
          onToggle: toggleNearby,
        }}
      />

      {showSkeleton && <PlaceGridSkeleton count={PAGE_SIZE} />}

      {!showSkeleton && places.length === 0 && (
        <EmptyState
          title={hasFilters ? "Nothing matches those filters" : "No places yet"}
          description={
            isNearby
              ? "Nothing catalogued within that distance. Try a wider radius, or turn off “Near me”."
              : hasFilters
                ? "Try a broader search, or clear the filters to see everything."
                : "Be the first to add somewhere worth visiting."
          }
          action={
            hasFilters ? (
              <Button variant="ghost" onClick={clearFilters}>
                Clear filters
              </Button>
            ) : (
              <Button to={auth.isLoggedIn ? "/places/new" : "/auth"}>
                {auth.isLoggedIn ? "Add the first place" : "Sign in to contribute"}
              </Button>
            )
          }
        />
      )}

      {!showSkeleton && places.length > 0 && view === "grid" && (
        <PlaceGrid
          places={places}
          onDeleted={handleDeleted}
          onSelectTag={(tag) => applyFilters({ ...filters, tag, page: 1 })}
        />
      )}

      {!showSkeleton && places.length > 0 && view === "map" && (
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
