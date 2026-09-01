import React, { useState, useEffect, useId } from "react";

import {
  MAX_TAGS,
  MIN_TAG_LENGTH,
  MAX_TAG_LENGTH,
  normalizeTag,
} from "../../../util/tags";
import "./TagInput.scss";

/**
 * Chip-style tag editor. Commits on Enter, comma or blur; backspace on an empty
 * field removes the last chip.
 */
const TagInput = ({
  id = "tags",
  label = "Tags",
  hint,
  suggestions = [],
  initialValue = [],
  onInput,
}) => {
  const [tags, setTags] = useState(initialValue);
  const [draft, setDraft] = useState("");
  const [tagError, setTagError] = useState("");
  const fieldId = useId();

  useEffect(() => {
    // Tags are optional, so this field is always "valid" as far as the form is
    // concerned - it only contributes a value.
    onInput(id, tags, true);
  }, [id, tags, onInput]);

  const addTag = (raw) => {
    const tag = normalizeTag(raw);
    if (!tag) return;

    if (tag.length < MIN_TAG_LENGTH) {
      setTagError(`Tags need at least ${MIN_TAG_LENGTH} characters.`);
      return;
    }
    // Without this the chip renders happily and the server drops it on save.
    if (tag.length > MAX_TAG_LENGTH) {
      setTagError(`Tags can be at most ${MAX_TAG_LENGTH} characters.`);
      return;
    }
    if (tags.includes(tag)) {
      setTagError(`"${tag}" is already added.`);
      setDraft("");
      return;
    }
    if (tags.length >= MAX_TAGS) {
      setTagError(`That is the maximum of ${MAX_TAGS} tags.`);
      return;
    }

    setTags((current) => [...current, tag]);
    setDraft("");
    setTagError("");
  };

  const removeTag = (tag) =>
    setTags((current) => current.filter((existing) => existing !== tag));

  const keyDownHandler = (event) => {
    if (event.key === "Enter" || event.key === ",") {
      // Enter would otherwise submit the surrounding form.
      event.preventDefault();
      addTag(draft);
      return;
    }
    if (event.key === "Backspace" && !draft && tags.length) {
      removeTag(tags[tags.length - 1]);
    }
  };

  const unusedSuggestions = suggestions
    .filter((tag) => !tags.includes(tag))
    .slice(0, 6);

  return (
    <div className="field tag-input">
      <label className="field__label" htmlFor={fieldId}>
        {label}
      </label>

      <div className="tag-input__box">
        {tags.map((tag) => (
          <span className="tag-input__chip" key={tag}>
            {tag}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              aria-label={`Remove tag ${tag}`}
            >
              &times;
            </button>
          </span>
        ))}
        <input
          id={fieldId}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={keyDownHandler}
          onBlur={() => addTag(draft)}
          placeholder={tags.length ? "" : "unesco, hiking, viewpoint"}
          disabled={tags.length >= MAX_TAGS}
        />
      </div>

      {unusedSuggestions.length > 0 && (
        <div className="tag-input__suggestions">
          <span>Popular:</span>
          {unusedSuggestions.map((tag) => (
            <button type="button" key={tag} onClick={() => addTag(tag)}>
              + {tag}
            </button>
          ))}
        </div>
      )}

      <p className="field__help">
        {tagError || hint || `${tags.length}/${MAX_TAGS} tags`}
      </p>
    </div>
  );
};

export default TagInput;
