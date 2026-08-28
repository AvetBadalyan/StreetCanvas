import React from "react";

import "./EmptyState.scss";

/**
 * Used wherever a list comes back empty. An empty grid with no explanation
 * reads as a bug, which is exactly how the old "no places found" screen felt.
 */
const EmptyState = ({ icon = "▦", title, description, action }) => (
  <div className="empty-state">
    <span className="empty-state__icon" aria-hidden="true">
      {icon}
    </span>
    <h2>{title}</h2>
    {description && <p>{description}</p>}
    {action && <div className="empty-state__action">{action}</div>}
  </div>
);

export default EmptyState;
