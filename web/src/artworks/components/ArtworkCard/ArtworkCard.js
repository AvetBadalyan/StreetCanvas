import React, { useState } from "react";
import { Link } from "react-router-dom";

import { useAuthContext } from "../../../shared/context/auth-context";
import { useHttpClient } from "../../../shared/hooks/http-hook";
import { deleteArtwork } from "../../../shared/api/artworks";
import { resolveImageUrl } from "../../../shared/api/client";
import { labelForForm } from "../../util/art-forms";
import Button from "../../../shared/components/FormElements/Button/Button";
import Modal from "../../../shared/components/UIElements/Modal/Modal";
import ErrorModal from "../../../shared/components/UIElements/ErrorModal";
import LoadingSpinner from "../../../shared/components/UIElements/LoadingSpinner/LoadingSpinner";
import Map from "../../../shared/components/UIElements/Map/Map";
import Avatar from "../../../shared/components/UIElements/Avatar/Avatar";
import "./ArtworkCard.scss";

const ArtworkCard = ({ artwork, onDeleted, onSelectTag }) => {
  const auth = useAuthContext();
  const { isLoading, error, run, clearError } = useHttpClient();

  const [showMap, setShowMap] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);

  // Every endpoint that returns an artwork populates its creator, so this is
  // always an object - see CREATOR_FIELDS in the artworks controller.
  const { creator } = artwork;
  const isOwner = auth.userId && auth.userId === creator.id;

  const imageUrl = resolveImageUrl(artwork.image);

  const confirmDelete = async () => {
    setShowConfirm(false);
    try {
      await run((options) =>
        deleteArtwork(artwork.id, { ...options, token: auth.token })
      );
      onDeleted?.(artwork.id);
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
        header={artwork.address}
        flush
        wide
        footer={
          <Button variant="ghost" onClick={() => setShowMap(false)}>
            Close
          </Button>
        }
      >
        <div className="artwork-card__map">
          <Map
            markers={[
              {
                id: artwork.id,
                lat: artwork.location?.lat,
                lng: artwork.location?.lng,
                title: artwork.title,
                subtitle: artwork.address,
              },
            ]}
            zoom={16}
          />
        </div>
      </Modal>

      <Modal
        show={showConfirm}
        onCancel={() => setShowConfirm(false)}
        header="Delete this find?"
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
          &ldquo;{artwork.title}&rdquo; and its photo will be removed for good.
          This cannot be undone.
        </p>
      </Modal>

      <li className="artwork-card">
        {isLoading && <LoadingSpinner asOverlay />}

        <div className="artwork-card__media">
          {imageUrl && !imageFailed ? (
            <img
              src={imageUrl}
              alt={artwork.title}
              loading="lazy"
              onError={() => setImageFailed(true)}
            />
          ) : (
            <div className="artwork-card__media-fallback">
              Photo unavailable
            </div>
          )}
          <span className="artwork-card__form">{labelForForm(artwork.form)}</span>
        </div>

        <div className="artwork-card__body">
          <h3 className="artwork-card__title">{artwork.title}</h3>
          <p className="artwork-card__artist">
            by {artwork.artist || "Unknown"}
          </p>
          <p className="artwork-card__address" title={artwork.address}>
            {artwork.address}
          </p>
          <p className="artwork-card__description">{artwork.description}</p>

          {artwork.tags?.length > 0 && (
            <ul className="artwork-card__tags">
              {artwork.tags.map((tag) => (
                <li key={tag}>
                  <button type="button" onClick={() => onSelectTag?.(tag)}>
                    #{tag}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <footer className="artwork-card__footer">
          {creator?.name && (
            <Link
              className="artwork-card__creator"
              to={`/contributors/${creator.id}`}
            >
              <Avatar
                image={creator.image}
                alt={creator.name}
                className="artwork-card__creator-avatar"
              />
              <span>{creator.name}</span>
            </Link>
          )}

          <div className="artwork-card__actions">
            <Button variant="quiet" size="small" onClick={() => setShowMap(true)}>
              Map
            </Button>
            {isOwner && (
              <>
                <Button
                  variant="quiet"
                  size="small"
                  to={`/artworks/${artwork.id}/edit`}
                >
                  Edit
                </Button>
                <Button
                  variant="quiet"
                  size="small"
                  onClick={() => setShowConfirm(true)}
                >
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

export default ArtworkCard;
