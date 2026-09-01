import React, { useMemo, useState } from "react";

import { useTrip } from "./trip-context";
import { orderByNearest, totalKm, estimateHours, googleMapsUrl } from "./util/route";
import { resolveImageUrl } from "../shared/api/client";
import Button from "../shared/components/FormElements/Button/Button";
import Map from "../shared/components/UIElements/Map/Map";
import "./TripBar.scss";

/**
 * The day being planned, as a bar pinned to the bottom of the screen.
 *
 * Hidden entirely when nothing is selected, so it never costs space until the
 * visitor has actually started building something.
 *
 * @param {{lat:number,lng:number}|null} startPoint where the day begins - the
 *   visitor's location when known, otherwise the first place they picked.
 */
const TripBar = ({ startPoint }) => {
  const trip = useTrip();
  const [isOpen, setIsOpen] = useState(false);

  const start = startPoint || trip.places[0]?.location || null;

  // Recomputed only when the selection or the starting point changes - the
  // ordering is cheap, but it also feeds the map, which is not.
  const { orderedPlaces, km, hours } = useMemo(() => {
    if (!start || trip.places.length === 0) {
      return { orderedPlaces: [], km: 0, hours: 0 };
    }
    const route = orderByNearest(start, trip.places);
    return { orderedPlaces: route, km: totalKm(route), hours: estimateHours(route) };
  }, [start, trip.places]);

  const markers = useMemo(
    () =>
      orderedPlaces.map((place, index) => ({
        id: place.id,
        lat: place.location.lat,
        lng: place.location.lng,
        title: `${index + 1}. ${place.title}`,
        subtitle: place.region,
      })),
    [orderedPlaces]
  );

  if (trip.places.length === 0) return null;

  const mapsUrl = googleMapsUrl(start, orderedPlaces);

  return (
    <>
      {isOpen && (
        <div className="trip-panel" role="dialog" aria-label="Your day">
          <header className="trip-panel__header">
            <div>
              <h2>Your day</h2>
              <p>
                {orderedPlaces.length} {orderedPlaces.length === 1 ? "stop" : "stops"} ·{" "}
                {km} km · about {hours} h
              </p>
            </div>
            <Button variant="ghost" size="small" onClick={() => setIsOpen(false)}>
              Close
            </Button>
          </header>

          <div className="trip-panel__body">
            <ol className="trip-panel__stops">
              {orderedPlaces.map((place, index) => (
                <li key={place.id}>
                  <span className="trip-panel__index">{index + 1}</span>
                  <img
                    src={resolveImageUrl(place.image)}
                    alt=""
                    loading="lazy"
                    onError={(e) => {
                      e.currentTarget.style.visibility = "hidden";
                    }}
                  />
                  <div className="trip-panel__stop-text">
                    <strong>{place.title}</strong>
                    <span>
                      {place.region} · {place.legKm} km from previous stop
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => trip.remove(place.id)}
                    aria-label={`Remove ${place.title}`}
                  >
                    &times;
                  </button>
                </li>
              ))}
            </ol>

            <div className="trip-panel__map">
              <Map markers={markers} />
            </div>
          </div>

          <footer className="trip-panel__footer">
            <p className="trip-panel__caveat">
              Distances are straight-line and the order is a nearest-first
              estimate, so treat the timing as a rough guide.
            </p>
            <div className="trip-panel__actions">
              <Button variant="ghost" size="small" onClick={trip.clear}>
                Clear
              </Button>
              {mapsUrl && (
                <Button size="small" href={mapsUrl}>
                  Open in Google Maps
                </Button>
              )}
            </div>
          </footer>
        </div>
      )}

      <div className="trip-bar">
        <div className="trip-bar__inner">
          <span className="trip-bar__count">
            <strong>{trip.places.length}</strong>{" "}
            {trip.places.length === 1 ? "stop" : "stops"} planned
            {km > 0 && <em> · {km} km</em>}
          </span>
          <div className="trip-bar__actions">
            <Button variant="ghost" size="small" onClick={trip.clear}>
              Clear
            </Button>
            <Button size="small" onClick={() => setIsOpen((open) => !open)}>
              {isOpen ? "Hide plan" : "See my day"}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
};

export default TripBar;
