import React, { useState } from "react";
import { Link } from "react-router-dom";

import { useAuthContext } from "../../../shared/context/auth-context";
import { useSaved } from "../../../shared/context/saved-context";
import { useTrip } from "../../../trip/trip-context";
import { useHttpClient } from "../../../shared/hooks/http-hook";
import { deletePlace } from "../../../shared/api/places";
import { resolveImageUrl } from "../../../shared/api/client";
import { labelForCategory } from "../../util/categories";
import Button from "../../../shared/components/FormElements/Button/Button";
import Modal from "../../../shared/components/UIElements/Modal/Modal";
import ErrorModal from "../../../shared/components/UIElements/ErrorModal";
import LoadingSpinner from "../../../shared/components/UIElements/LoadingSpinner/LoadingSpinner";
import Map from "../../../shared/components/UIElements/Map/Map";
import Avatar from "../../../shared/components/UIElements/Avatar/Avatar";
import "./PlaceCard.scss";

const PlaceCard = ({ place, onDeleted, onSelectTag }) => {
  const auth = useAuthContext();
  const saved = useSaved();
  const trip = useTrip();
  const { isLoading, error, run, clearError } = useHttpClient();

  const [showMap, setShowMap] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);

  // Every endpoint that returns a place populates its creator, so this is
  // always an object - see CREATOR_FIELDS in the places controller.
  const { creator } = place;
  const isOwner = auth.userId && auth.userId === creator?.id;
  const imageUrl = resolveImageUrl(place.image);
  const inTrip = trip.has(place.id);

  const confirmDelete = async () => {
    setShowConfirm(false);
    try {
      await run((options) => deletePlace(place.id, { ...options, token: auth.token }));
      onDeleted?.(place.id);
    } catch {
      // The hook has already put the message on screen.
    }
  };

  return (
    <>
      <ErrorModal error={error} onClear={clearError} />

      <Modal
        show={showMap}
        onCancel={() => setShowMap(false)}
        header={place.title}
        flush
        wide
        footer={
          <Button variant="ghost" onClick={() => setShowMap(false)}>
            Close
          </Button>
        }
      >
        <div className="place-card__map">
          <Map
            markers={[
              {
                id: place.id,
                lat: place.location?.lat,
                lng: place.location?.lng,
                title: place.title,
                subtitle: place.region,
              },
            ]}
            zoom={13}
          />
        </div>
      </Modal>

      <Modal
        show={showConfirm}
        onCancel={() => setShowConfirm(false)}
        header="Delete this place?"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowConfirm(false)}>
              Keep it
            </Button>
            <Button variant="danger" onClick={confirmDelete}>
              Delete
            </Button>
          </>
        }
      >
        <p>
          &ldquo;{place.title}&rdquo; and its photo will be removed for good.
          This cannot be undone.
        </p>
      </Modal>

      <li className={`place-card ${inTrip ? "place-card--in-trip" : ""}`}>
        {isLoading && <LoadingSpinner asOverlay />}

        <div className="place-card__media">
          {imageUrl && !imageFailed ? (
            <img
              src={imageUrl}
              alt={place.title}
              loading="lazy"
              onError={() => setImageFailed(true)}
            />
          ) : (
            <div className="place-card__media-fallback">Photo unavailable</div>
          )}

          <span className="place-card__category">
            {labelForCategory(place.category)}
          </span>

          {/* Only present when the list came from a proximity search. */}
          {typeof place.distanceKm === "number" && (
            <span className="place-card__distance">{place.distanceKm} km away</span>
          )}
        </div>

        <div className="place-card__body">
          <h3 className="place-card__title">{place.title}</h3>
          <p className="place-card__region">
            {place.region}
            {place.year ? ` · ${place.year}` : ""}
          </p>
          <p className="place-card__description">{place.description}</p>

          {place.tags?.length > 0 && (
            <ul className="place-card__tags">
              {place.tags.map((tag) => (
                <li key={tag}>
                  <button type="button" onClick={() => onSelectTag?.(tag)}>
                    #{tag}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="place-card__save">
          {auth.isLoggedIn ? (
            <>
              <button
                type="button"
                className={saved.isSaved("wishlist", place.id) ? "is-on" : ""}
                onClick={() => saved.toggle("wishlist", place.id)}
                aria-pressed={saved.isSaved("wishlist", place.id)}
              >
                ☆ Want to go
              </button>
              <button
                type="button"
                className={saved.isSaved("visited", place.id) ? "is-on" : ""}
                onClick={() => saved.toggle("visited", place.id)}
                aria-pressed={saved.isSaved("visited", place.id)}
              >
                ✓ Been here
              </button>
            </>
          ) : (
            <Link to="/auth" className="place-card__save-prompt">
              Sign in to save places
            </Link>
          )}

          <button
            type="button"
            className={`place-card__trip ${inTrip ? "is-on" : ""}`}
            onClick={() => trip.toggle(place)}
            disabled={!inTrip && trip.isFull}
            title={
              !inTrip && trip.isFull
                ? "Your day is full - remove a stop first"
                : undefined
            }
          >
            {inTrip ? "− Remove from day" : "+ Add to my day"}
          </button>
        </div>

        <footer className="place-card__footer">
          {creator?.name && (
            <Link className="place-card__creator" to={`/contributors/${creator.id}`}>
              <Avatar
                image={creator.image}
                alt={creator.name}
                className="place-card__creator-avatar"
              />
              <span>{creator.name}</span>
            </Link>
          )}

          <div className="place-card__actions">
            {place.sourceUrl && (
              <Button
                variant="quiet"
                size="small"
                href={place.sourceUrl}
                title={`View this record on ${place.sourceName || "the source"}`}
              >
                Source
              </Button>
            )}
            <Button variant="quiet" size="small" onClick={() => setShowMap(true)}>
              Map
            </Button>
            {isOwner && (
              <>
                <Button variant="quiet" size="small" to={`/places/${place.id}/edit`}>
                  Edit
                </Button>
                <Button variant="quiet" size="small" onClick={() => setShowConfirm(true)}>
                  Delete
                </Button>
              </>
            )}
          </div>
        </footer>
      </li>
    </>
  );
};

export default PlaceCard;
