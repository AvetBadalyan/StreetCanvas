import React, { useRef, useEffect } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import "./Map.scss";

// Plain OpenStreetMap tiles: free, no API key, no signup. The dark look comes
// from a CSS filter on the tile layer (see index.scss) rather than from a
// themed tile provider - CARTO's dark basemap now requires a key, and the
// others that look good all want an account.
const TILE_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

// Leaflet's default marker points at PNGs resolved relative to the CSS, which
// webpack does not rewrite - the usual result is an invisible marker. A divIcon
// is styled with our own CSS instead and needs no assets at all.
const pinIcon = L.divIcon({
  className: "map-pin",
  html: '<span class="map-pin__dot"></span>',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
  popupAnchor: [0, -10],
});

const escapeHtml = (value = "") =>
  value.replace(
    /[&<>"']/g,
    (char) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[char]
  );

/**
 * Renders one or many place locations.
 *
 * With a single marker it centres on it; with several it fits the viewport to
 * cover them all, which is what the explore map view needs.
 */
const Map = ({ markers = [], zoom = 15, className = "", style }) => {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const layerRef = useRef(null);

  // Create the map once. Re-creating it on every render leaks tile requests and
  // resets the user's pan/zoom.
  useEffect(() => {
    const map = L.map(containerRef.current, {
      scrollWheelZoom: false,
      attributionControl: true,
    });

    L.tileLayer(TILE_URL, {
      attribution: TILE_ATTRIBUTION,
      maxZoom: 19,
    }).addTo(map);

    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;

    layer.clearLayers();

    const points = markers.filter(
      (marker) =>
        Number.isFinite(marker?.lat) && Number.isFinite(marker?.lng)
    );

    if (points.length === 0) {
      map.setView([20, 0], 2);
      return;
    }

    points.forEach((point) => {
      const marker = L.marker([point.lat, point.lng], { icon: pinIcon });
      if (point.title) {
        marker.bindPopup(
          `<strong>${escapeHtml(point.title)}</strong>${
            point.subtitle ? `<br/>${escapeHtml(point.subtitle)}` : ""
          }`
        );
      }
      marker.addTo(layer);
    });

    if (points.length === 1) {
      map.setView([points[0].lat, points[0].lng], zoom);
    } else {
      map.fitBounds(
        L.latLngBounds(points.map((point) => [point.lat, point.lng])),
        { padding: [40, 40], maxZoom: 13 }
      );
    }

    // Leaflet measures the container on creation; if it was hidden (inside a
    // modal that just opened) those measurements are zero until told otherwise.
    setTimeout(() => map.invalidateSize(), 0);
  }, [markers, zoom]);

  return <div ref={containerRef} className={`map ${className}`} style={style} />;
};

export default Map;
