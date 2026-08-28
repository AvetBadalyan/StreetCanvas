import React from "react";

import { ART_FORMS, labelForForm } from "../../util/art-forms";
import "./ArtworkFilters.scss";

const SORT_OPTIONS = [
  { value: "recent", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "title", label: "A to Z" },
];

/**
 * Search, art-form and tag filters for the explore feed.
 *
 * Fully controlled: it renders whatever the page has in the URL and reports
 * changes back, so the filter state lives in one place and stays shareable.
 */
const ArtworkFilters = ({
  filters,
  facets,
  onChange,
  onClearFilters,
  view,
  onViewChange,
  resultCount,
}) => {
  const { q = "", form = "", tag = "", sort = "recent" } = filters;
  const hasActiveFilter = Boolean(q || form || tag);

  const update = (patch) => onChange({ ...filters, ...patch, page: 1 });

  // Only offer art forms that something is actually filed under.
  const availableForms = ART_FORMS.filter((option) =>
    facets.forms?.some((facet) => facet.form === option.value)
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
            placeholder="Search by title, artist, city or tag"
            aria-label="Search artworks"
          />
        </div>

        <select
          className="filters__select"
          value={form}
          onChange={(event) => update({ form: event.target.value })}
          aria-label="Filter by art form"
        >
          <option value="">All forms</option>
          {availableForms.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <select
          className="filters__select"
          value={sort}
          onChange={(event) => update({ sort: event.target.value })}
          aria-label="Sort artworks"
        >
          {SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

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
            : `${resultCount} ${resultCount === 1 ? "find" : "finds"}`}
          {form && ` · ${labelForForm(form)}`}
          {tag && ` · #${tag}`}
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

export default ArtworkFilters;
