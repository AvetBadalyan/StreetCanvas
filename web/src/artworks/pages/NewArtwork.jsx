import React from "react";
import { useNavigate } from "react-router-dom";

import { createArtwork } from "../../shared/api/artworks";
import { useHttpClient } from "../../shared/hooks/http-hook";
import { useTagSuggestions } from "../../shared/hooks/use-tag-suggestions";
import { useAuthContext } from "../../shared/context/auth-context";
import ArtworkForm from "../components/ArtworkForm/ArtworkForm";
import ErrorModal from "../../shared/components/UIElements/ErrorModal";

const NewArtwork = () => {
  const auth = useAuthContext();
  const navigate = useNavigate();
  const { isLoading, error, run, clearError } = useHttpClient();
  const tagSuggestions = useTagSuggestions();

  const submitHandler = async (values) => {
    const formData = new FormData();
    formData.append("title", values.title);
    formData.append("description", values.description);
    formData.append("address", values.address);
    formData.append("artist", values.artist || "");
    formData.append("form", values.form);
    // Multipart bodies cannot carry arrays, so the server accepts a
    // comma-separated list and normalises it.
    formData.append("tags", (values.tags || []).join(","));
    formData.append("image", values.image);

    try {
      await run((options) =>
        createArtwork(formData, { ...options, token: auth.token })
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
        <h1>Add a find</h1>
        <p>
          Pin a piece of street art to the map so other people can go and see it.
        </p>
      </header>

      <ArtworkForm
        mode="create"
        onSubmit={submitHandler}
        isLoading={isLoading}
        tagSuggestions={tagSuggestions}
      />
    </div>
  );
};

export default NewArtwork;
