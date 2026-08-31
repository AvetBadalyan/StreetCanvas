import React from "react";

import PlaceCard from "../PlaceCard/PlaceCard";
import "./PlaceGrid.scss";

const PlaceGrid = ({ places, onDeleted, onSelectTag }) => (
  <ul className="place-grid">
    {places.map((place) => (
      <PlaceCard
        key={place.id}
        place={place}
        onDeleted={onDeleted}
        onSelectTag={onSelectTag}
      />
    ))}
  </ul>
);

export default PlaceGrid;
