import React from "react";

import {
  VALIDATOR_REQUIRE,
  VALIDATOR_MINLENGTH,
  VALIDATOR_MAXLENGTH,
} from "../../../shared/util/validators";
import { useForm } from "../../../shared/hooks/form-hook";
import { CATEGORIES } from "../../util/categories";
import {
  TITLE_MIN,
  TITLE_MAX,
  DESCRIPTION_MIN,
  DESCRIPTION_MAX,
  REGION_MAX,
  ADDRESS_MIN,
  ADDRESS_MAX,
} from "../../util/constraints";
import Input from "../../../shared/components/FormElements/Input/Input";
import TagInput from "../../../shared/components/FormElements/TagInput/TagInput";
import ImageUpload from "../../../shared/components/FormElements/ImageUpload/ImageUpload";
import Button from "../../../shared/components/FormElements/Button/Button";
import LoadingSpinner from "../../../shared/components/UIElements/LoadingSpinner/LoadingSpinner";
import "./PlaceForm.scss";

/**
 * One form for both adding and editing.
 *
 * The photo and location are only editable on create - the API deliberately
 * does not re-geocode or re-upload on PATCH.
 */
const PlaceForm = ({
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
      region: { value: initial.region || "", isValid: true },
      category: { value: initial.category || CATEGORIES[0].value, isValid: true },
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
    <form className="place-form" onSubmit={submitHandler}>
      {isLoading && <LoadingSpinner asOverlay />}

      {isCreate && (
        <ImageUpload
          id="image"
          label="Photo"
          hint="A clear shot of the place itself works best."
          onInput={inputHandler}
        />
      )}

      <Input
        id="title"
        element="input"
        label="Name"
        placeholder="Haghartsin Monastery"
        hint="What is this place called?"
        validators={[
          VALIDATOR_MINLENGTH(TITLE_MIN),
          VALIDATOR_MAXLENGTH(TITLE_MAX),
        ]}
        errorText={`Give it a name between ${TITLE_MIN} and ${TITLE_MAX} characters.`}
        initialValue={initial.title}
        initialValid={!isCreate}
        onInput={inputHandler}
      />

      <div className="place-form__row">
        <Input
          id="region"
          element="input"
          label="Region"
          placeholder="Tavush Province"
          hint="Province or nearest town."
          validators={[VALIDATOR_MAXLENGTH(REGION_MAX)]}
          errorText={`Region name must be under ${REGION_MAX} characters.`}
          initialValue={initial.region}
          initialValid
          onInput={inputHandler}
        />

        <Input
          id="category"
          element="select"
          label="Kind of place"
          options={CATEGORIES}
          validators={[]}
          initialValue={initial.category || CATEGORIES[0].value}
          initialValid
          onInput={inputHandler}
        />
      </div>

      {isCreate && (
        <Input
          id="address"
          element="input"
          label="Where is it?"
          placeholder="Haghartsin, Tavush, Armenia"
          hint="Village and province - we'll find it on the map."
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
        label="Why go?"
        placeholder="What makes it worth the drive? When is it at its best?"
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

      <div className="place-form__actions">
        <Button type="submit" size="large" disabled={!formState.isValid || isLoading}>
          {isCreate ? "Add to the map" : "Save changes"}
        </Button>
        <Button variant="ghost" size="large" to="/">
          Cancel
        </Button>
      </div>
    </form>
  );
};

export default PlaceForm;
