import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";

import { fetchPlace, updatePlace } from "../../shared/api/places";
import { useHttpClient } from "../../shared/hooks/http-hook";
import { useTagSuggestions } from "../../shared/hooks/use-tag-suggestions";
import { useAuthContext } from "../../shared/context/auth-context";
import PlaceForm from "../components/PlaceForm/PlaceForm";
import ErrorModal from "../../shared/components/UIElements/ErrorModal";
import EmptyState from "../../shared/components/UIElements/EmptyState/EmptyState";
import LoadingSpinner from "../../shared/components/UIElements/LoadingSpinner/LoadingSpinner";
import Button from "../../shared/components/FormElements/Button/Button";

const EditPlace = () => {
  const { placeId } = useParams();
  const auth = useAuthContext();
  const navigate = useNavigate();

  const { isLoading, error, run, clearError } = useHttpClient();
  const [place, setPlace] = useState(null);
  const tagSuggestions = useTagSuggestions();

  useEffect(() => {
    const load = async () => {
      try {
        const data = await run((options) => fetchPlace(placeId, options));
        setPlace(data.place);
      } catch {
        // Handled below by the empty state.
      }
    };
    load();
  }, [run, placeId]);

  const submitHandler = async (values) => {
    try {
      await run((options) =>
        updatePlace(
          placeId,
          {
            title: values.title,
            description: values.description,
            region: values.region || "",
            category: values.category,
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

  if (isLoading && !place) {
    return (
      <div className="page center">
        <LoadingSpinner />
      </div>
    );
  }

  if (!place) {
    return (
      <div className="page page--narrow">
        <ErrorModal error={error} onClear={clearError} />
        <EmptyState
          title="We couldn't find that place"
          description="It may have been deleted, or the link is wrong."
          action={<Button to="/">Back to explore</Button>}
        />
      </div>
    );
  }

  // The API enforces this too; checking here avoids showing a form that could
  // only ever fail on submit.
  if (place.creator.id !== auth.userId) {
    return (
      <div className="page page--narrow">
        <EmptyState
          title="That isn't yours to edit"
          description="You can only change places you added yourself."
          action={<Button to="/">Back to explore</Button>}
        />
      </div>
    );
  }

  return (
    <div className="page page--narrow">
      <ErrorModal error={error} onClear={clearError} />

      <header className="page__header">
        <h1>Edit place</h1>
        <p>
          The photo and location are fixed once added - delete and re-add if
          those need to change.
        </p>
      </header>

      <PlaceForm
        mode="edit"
        initial={place}
        onSubmit={submitHandler}
        isLoading={isLoading}
        tagSuggestions={tagSuggestions}
      />
    </div>
  );
};

export default EditPlace;
