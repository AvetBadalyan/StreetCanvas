import React, { useRef, useEffect } from "react";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

import "./Map.scss";

const Map = (props) => {
  const mapRef = useRef();
  const { center, zoom } = props;

  useEffect(() => {
    const map = L.map(mapRef.current).setView(center, zoom);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors",
    }).addTo(map);

    L.marker(center).addTo(map);

    return () => {
      map.remove();
    };
  }, [center, zoom]);

  return (
    <div
      ref={mapRef}
      className={`map ${props.className}`}
      style={props.style}
    ></div>
  );
};

export default Map;
