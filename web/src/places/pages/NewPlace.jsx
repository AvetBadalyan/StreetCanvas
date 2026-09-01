import React from "react";
import { useNavigate } from "react-router-dom";

import { createPlace } from "../../shared/api/places";
import { useHttpClient } from "../../shared/hooks/http-hook";
import { useTagSuggestions } from "../../shared/hooks/use-tag-suggestions";
import { useAuth } from "../../shared/context/auth-context";
import PlaceForm from "../components/PlaceForm/PlaceForm";
import ErrorModal from "../../shared/components/UIElements/ErrorModal";

const NewPlace = () => {
  const auth = useAuth();
  const navigate = useNavigate();
  const { isLoading, error, run, clearError } = useHttpClient();
  const tagSuggestions = useTagSuggestions();

  const submitHandler = async (values) => {
    const formData = new FormData();
    formData.append("title", values.title);
    formData.append("description", values.description);
    formData.append("address", values.address);
    formData.append("region", values.region || "");
    formData.append("category", values.category);
    // Multipart bodies cannot carry arrays, so the server accepts a
    // comma-separated list and normalises it.
    formData.append("tags", (values.tags || []).join(","));
    formData.append("image", values.image);

    try {
      await run((options) =>
        createPlace(formData, { ...options, token: auth.token })
      );
      navigate(`/contributors/${auth.userId}`);
    } catch {
      // Reported through the modal; keep the form filled in so nothing is lost.
    }
  };

  return (
    <div className="page page--narrow">
      <ErrorModal error={error} onClear={clearError} />

      <header className="page__header">
        <h1>Add a place</h1>
        <p>
          Add somewhere worth visiting so other people can find it.
        </p>
      </header>

      <PlaceForm
        mode="create"
        onSubmit={submitHandler}
        isLoading={isLoading}
        tagSuggestions={tagSuggestions}
      />
    </div>
  );
};

export default NewPlace;
