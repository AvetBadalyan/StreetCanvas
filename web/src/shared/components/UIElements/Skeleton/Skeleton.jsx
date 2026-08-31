import React from "react";

import "./Skeleton.scss";

/**
 * Placeholder that mirrors the shape of a place card.
 *
 * Shown instead of a lone spinner so the grid does not collapse and then jump
 * when results arrive - the layout is already the right size.
 */
const PlaceCardSkeleton = () => (
  <li className="skeleton-card" aria-hidden="true">
    <div className="skeleton-card__image" />
    <div className="skeleton-card__body">
      <div className="skeleton-line skeleton-line--title" />
      <div className="skeleton-line skeleton-line--short" />
      <div className="skeleton-card__chips">
        <span />
        <span />
      </div>
    </div>
  </li>
);

export const PlaceGridSkeleton = ({ count = 6 }) => (
  <ul className="place-grid" aria-busy="true" aria-label="Loading places">
    {Array.from({ length: count }, (_, index) => (
      <PlaceCardSkeleton key={index} />
    ))}
  </ul>
);
