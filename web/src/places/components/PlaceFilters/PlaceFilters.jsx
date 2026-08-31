import React from "react";

import { CATEGORIES, labelForCategory } from "../../util/categories";
import "./PlaceFilters.scss";

// Mirrors SORT_OPTIONS in the places controller.
const SORT_OPTIONS = [
  { value: "recent", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "title", label: "A to Z" },
];

const RADIUS_OPTIONS = [10, 25, 50, 100];

/**
 * Search, category and proximity filters.
 *
 * Fully controlled: it renders whatever the page has in the URL and reports
 * changes back, so the filter state lives in one place and stays shareable.
 */
const PlaceFilters = ({
  filters,
  facets,
  onChange,
  onClearFilters,
  view,
  onViewChange,
  resultCount,
  nearby,
}) => {
  const { q = "", category = "", tag = "", sort = "recent", radius = 25 } = filters;
  const hasActiveFilter = Boolean(q || category || tag || nearby.isActive);

  const update = (patch) => onChange({ ...filters, ...patch, page: 1 });

  // Only offer categories something is actually filed under.
  const availableCategories = CATEGORIES.filter((option) =>
    facets.categories?.some((facet) => facet.category === option.value)
  );

  return (
    <div className="filters">
      <div className="filters__row">
        <div className="filters__search">
          <span className="filters__search-icon" aria-hidden="true">
            &#9906;
          </span>
          <input
            type="search"
            value={q}
            onChange={(event) => update({ q: event.target.value })}
            placeholder="Search by name, region or tag"
            aria-label="Search places"
          />
        </div>

        <select
          className="filters__select"
          value={category}
          onChange={(event) => update({ category: event.target.value })}
          aria-label="Filter by category"
        >
          <option value="">All kinds</option>
          {availableCategories.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        {/*
          Sorting by date is meaningless once results are ordered by distance,
          so the control is swapped for a radius picker in that mode.
        */}
        {nearby.isActive ? (
          <select
            className="filters__select"
            value={radius}
            onChange={(event) => update({ radius: Number(event.target.value) })}
            aria-label="Search radius"
          >
            {RADIUS_OPTIONS.map((km) => (
              <option key={km} value={km}>
                within {km} km
              </option>
            ))}
          </select>
        ) : (
          <select
            className="filters__select"
            value={sort}
            onChange={(event) => update({ sort: event.target.value })}
            aria-label="Sort places"
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        )}

        <button
          type="button"
          className={`filters__near ${nearby.isActive ? "is-on" : ""}`}
          onClick={nearby.onToggle}
          disabled={nearby.status === "locating"}
        >
          {nearby.status === "locating"
            ? "Locating…"
            : nearby.isActive
              ? "✓ Near me"
              : "◎ Near me"}
        </button>

        <div className="filters__view" role="group" aria-label="View mode">
          <button
            type="button"
            className={view === "grid" ? "is-active" : ""}
            onClick={() => onViewChange("grid")}
            aria-pressed={view === "grid"}
          >
            Grid
          </button>
          <button
            type="button"
            className={view === "map" ? "is-active" : ""}
            onClick={() => onViewChange("map")}
            aria-pressed={view === "map"}
          >
            Map
          </button>
        </div>
      </div>

      {nearby.error && <p className="filters__note">{nearby.error}</p>}

      {facets.tags?.length > 0 && (
        <div className="filters__tags">
          {facets.tags.slice(0, 12).map(({ tag: name, count }) => (
            <button
              type="button"
              key={name}
              className={tag === name ? "is-active" : ""}
              // Clicking the active tag clears it, so the chips work as toggles.
              onClick={() => update({ tag: tag === name ? "" : name })}
            >
              #{name}
              <span>{count}</span>
            </button>
          ))}
        </div>
      )}

      <div className="filters__summary">
        <span>
          {resultCount === null
            ? "Loading…"
            : `${resultCount} ${resultCount === 1 ? "place" : "places"}`}
          {category && ` · ${labelForCategory(category)}`}
          {tag && ` · #${tag}`}
          {nearby.isActive && ` · within ${radius} km of you`}
        </span>
        {hasActiveFilter && (
          <button type="button" onClick={onClearFilters}>
            Clear filters
          </button>
        )}
      </div>
    </div>
  );
};

export default PlaceFilters;
