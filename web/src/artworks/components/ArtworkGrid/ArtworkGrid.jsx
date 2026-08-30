import React from "react";

import ArtworkCard from "../ArtworkCard/ArtworkCard";
import "./ArtworkGrid.scss";

const ArtworkGrid = ({ artworks, onDeleted, onSelectTag }) => (
  <ul className="artwork-grid">
    {artworks.map((artwork) => (
      <ArtworkCard
        key={artwork.id}
        artwork={artwork}
        onDeleted={onDeleted}
        onSelectTag={onSelectTag}
      />
    ))}
  </ul>
);

export default ArtworkGrid;
