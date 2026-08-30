import React from "react";

import {
  VALIDATOR_REQUIRE,
  VALIDATOR_MINLENGTH,
  VALIDATOR_MAXLENGTH,
} from "../../../shared/util/validators";
import { useForm } from "../../../shared/hooks/form-hook";
import { ART_FORMS } from "../../util/art-forms";
import {
  TITLE_MIN,
  TITLE_MAX,
  DESCRIPTION_MIN,
  DESCRIPTION_MAX,
  ARTIST_MAX,
  ADDRESS_MIN,
  ADDRESS_MAX,
} from "../../util/constraints";
import Input from "../../../shared/components/FormElements/Input/Input";
import TagInput from "../../../shared/components/FormElements/TagInput/TagInput";
import ImageUpload from "../../../shared/components/FormElements/ImageUpload/ImageUpload";
import Button from "../../../shared/components/FormElements/Button/Button";
import LoadingSpinner from "../../../shared/components/UIElements/LoadingSpinner/LoadingSpinner";
import "./ArtworkForm.scss";

/**
 * One form for both creating and editing.
 *
 * The tutorial this project grew out of had two near-identical page components
 * for these; keeping a single form means a new field is added once.
 *
 * The photo and address are only editable on create - the API deliberately does
 * not re-geocode or re-upload on PATCH.
 */
const ArtworkForm = ({
  mode = "create",
  initial = {},
  onSubmit,
  isLoading,
  tagSuggestions = [],
}) => {
  const isCreate = mode === "create";

  const [formState, inputHandler] = useForm(
    {
      title: { value: initial.title || "", isValid: !isCreate },
      description: { value: initial.description || "", isValid: !isCreate },
      artist: { value: initial.artist || "", isValid: true },
      form: { value: initial.form || "mural", isValid: true },
      tags: { value: initial.tags || [], isValid: true },
      ...(isCreate
        ? {
            address: { value: "", isValid: false },
            image: { value: null, isValid: false },
          }
        : {}),
    },
    !isCreate
  );

  const submitHandler = (event) => {
    event.preventDefault();
    const values = Object.fromEntries(
      Object.entries(formState.inputs).map(([key, input]) => [key, input.value])
    );
    onSubmit(values);
  };

  return (
    <form className="artwork-form" onSubmit={submitHandler}>
      {isLoading && <LoadingSpinner asOverlay />}

      {isCreate && (
        <ImageUpload
          id="image"
          label="Photo of the piece"
          hint="A straight-on shot works best."
          onInput={inputHandler}
        />
      )}

      <Input
        id="title"
        element="input"
        label="Title"
        placeholder="Cascade Steps Mural"
        hint="What would you call it?"
        validators={[
          VALIDATOR_MINLENGTH(TITLE_MIN),
          VALIDATOR_MAXLENGTH(TITLE_MAX),
        ]}
        errorText={`Give it a name between ${TITLE_MIN} and ${TITLE_MAX} characters.`}
        initialValue={initial.title}
        initialValid={!isCreate}
        onInput={inputHandler}
      />

      <div className="artwork-form__row">
        <Input
          id="artist"
          element="input"
          label="Artist"
          placeholder="Unknown"
          hint="Leave blank if you don't know."
          validators={[VALIDATOR_MAXLENGTH(ARTIST_MAX)]}
          errorText={`Artist name must be under ${ARTIST_MAX} characters.`}
          initialValue={initial.artist}
          initialValid
          onInput={inputHandler}
        />

        <Input
          id="form"
          element="select"
          label="Art form"
          options={ART_FORMS}
          validators={[]}
          initialValue={initial.form || "mural"}
          initialValid
          onInput={inputHandler}
        />
      </div>

      {isCreate && (
        <Input
          id="address"
          element="input"
          label="Where is it?"
          placeholder="Hosier Lane, Melbourne, Australia"
          hint="Street and city - we'll find it on the map."
          validators={[
            VALIDATOR_REQUIRE(),
            VALIDATOR_MINLENGTH(ADDRESS_MIN),
            VALIDATOR_MAXLENGTH(ADDRESS_MAX),
          ]}
          errorText="We need a location to pin it to the map."
          onInput={inputHandler}
        />
      )}

      <Input
        id="description"
        element="textarea"
        label="The story"
        placeholder="What makes it worth a detour? When is the light best?"
        // The server enforces the upper bound too; without it here a long story
        // only fails after the user has already submitted.
        validators={[
          VALIDATOR_MINLENGTH(DESCRIPTION_MIN),
          VALIDATOR_MAXLENGTH(DESCRIPTION_MAX),
        ]}
        errorText={`Between ${DESCRIPTION_MIN} and ${DESCRIPTION_MAX} characters, please.`}
        initialValue={initial.description}
        initialValid={!isCreate}
        onInput={inputHandler}
      />

      <TagInput
        id="tags"
        label="Tags"
        hint="Press Enter or comma to add. Helps people find it."
        suggestions={tagSuggestions}
        initialValue={initial.tags || []}
        onInput={inputHandler}
      />

      <div className="artwork-form__actions">
        <Button
          type="submit"
          size="large"
          disabled={!formState.isValid || isLoading}
        >
          {isCreate ? "Add to the map" : "Save changes"}
        </Button>
        <Button variant="ghost" size="large" to="/">
          Cancel
        </Button>
      </div>
    </form>
  );
};

export default ArtworkForm;
