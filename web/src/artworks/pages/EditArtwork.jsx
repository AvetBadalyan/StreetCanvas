import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";

import { fetchArtwork, updateArtwork } from "../../shared/api/artworks";
import { useHttpClient } from "../../shared/hooks/http-hook";
import { useTagSuggestions } from "../../shared/hooks/use-tag-suggestions";
import { useAuthContext } from "../../shared/context/auth-context";
import ArtworkForm from "../components/ArtworkForm/ArtworkForm";
import ErrorModal from "../../shared/components/UIElements/ErrorModal";
import EmptyState from "../../shared/components/UIElements/EmptyState/EmptyState";
import LoadingSpinner from "../../shared/components/UIElements/LoadingSpinner/LoadingSpinner";
import Button from "../../shared/components/FormElements/Button/Button";

const EditArtwork = () => {
  const { artworkId } = useParams();
  const auth = useAuthContext();
  const navigate = useNavigate();

  const { isLoading, error, run, clearError } = useHttpClient();
  const [artwork, setArtwork] = useState(null);
  const tagSuggestions = useTagSuggestions();

  useEffect(() => {
    const load = async () => {
      try {
        const data = await run((options) => fetchArtwork(artworkId, options));
        setArtwork(data.artwork);
      } catch {
        // Handled below by the empty state.
      }
    };
    load();
  }, [run, artworkId]);

  const submitHandler = async (values) => {
    try {
      await run((options) =>
        updateArtwork(
          artworkId,
          {
            title: values.title,
            description: values.description,
            artist: values.artist || "",
            form: values.form,
            tags: values.tags || [],
          },
          { ...options, token: auth.token }
        )
      );
      navigate(`/contributors/${auth.userId}`);
    } catch {
      // Reported through the modal.
    }
  };

  if (isLoading && !artwork) {
    return (
      <div className="page center">
        <LoadingSpinner />
      </div>
    );
  }

  if (!artwork) {
    return (
      <div className="page page--narrow">
        <ErrorModal error={error} onClear={clearError} />
        <EmptyState
          title="We couldn't find that artwork"
          description="It may have been deleted, or the link is wrong."
          action={<Button to="/">Back to explore</Button>}
        />
      </div>
    );
  }

  // The API enforces this too; checking here avoids showing a form that could
  // only ever fail on submit.
  if (artwork.creator.id !== auth.userId) {
    return (
      <div className="page page--narrow">
        <EmptyState
          title="That isn't yours to edit"
          description="You can only change finds you added yourself."
          action={<Button to="/">Back to explore</Button>}
        />
      </div>
    );
  }

  return (
    <div className="page page--narrow">
      <ErrorModal error={error} onClear={clearError} />

      <header className="page__header">
        <h1>Edit find</h1>
        <p>
          The photo and location are fixed once added - delete and re-add if
          those need to change.
        </p>
      </header>

      <ArtworkForm
        mode="edit"
        initial={artwork}
        onSubmit={submitHandler}
        isLoading={isLoading}
        tagSuggestions={tagSuggestions}
      />
    </div>
  );
};

export default EditArtwork;
