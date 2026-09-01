import React, { useRef, useState, useEffect, useId } from "react";

import Button from "../Button/Button";
import "./ImageUpload.scss";

// Kept in step with the API, which rejects anything larger. Checking here too
// means a visitor on a slow connection is told immediately instead of after a
// four-megabyte upload.
const MAX_BYTES = 4 * 1024 * 1024;
const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/webp"];

const formatSize = (bytes) => {
  const mb = bytes / (1024 * 1024);
  return `${Number.isInteger(mb) ? mb : mb.toFixed(1)} MB`;
};

const ImageUpload = ({ id, label = "Photo", hint, onInput }) => {
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [error, setError] = useState("");
  const [isDragging, setIsDragging] = useState(false);

  const filePickerRef = useRef();
  const fieldId = useId();

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    // Object URLs are cheaper than FileReader and easy to release, which
    // matters when someone swaps the photo a few times.
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const applyFile = (picked) => {
    if (!picked) return;

    if (!ACCEPTED_TYPES.includes(picked.type)) {
      setError("That file type is not supported. Use JPG, PNG or WEBP.");
      setFile(null);
      onInput(id, null, false);
      return;
    }

    if (picked.size > MAX_BYTES) {
      setError(
        `That image is ${formatSize(picked.size)}. Please use one under ${formatSize(MAX_BYTES)}.`
      );
      setFile(null);
      onInput(id, null, false);
      return;
    }

    setError("");
    setFile(picked);
    onInput(id, picked, true);
  };

  const dropHandler = (event) => {
    event.preventDefault();
    setIsDragging(false);
    applyFile(event.dataTransfer.files?.[0]);
  };

  return (
    <div className={`field image-upload ${error ? "field--invalid" : ""}`}>
      <label className="field__label" htmlFor={fieldId}>
        {label}
      </label>

      <input
        id={fieldId}
        ref={filePickerRef}
        className="sr-only"
        type="file"
        accept={ACCEPTED_TYPES.join(",")}
        onChange={(event) => applyFile(event.target.files?.[0])}
      />

      <div
        className={`image-upload__dropzone ${
          isDragging ? "image-upload__dropzone--active" : ""
        } ${previewUrl ? "image-upload__dropzone--filled" : ""}`}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={dropHandler}
      >
        {previewUrl ? (
          <img src={previewUrl} alt="Selected photo preview" />
        ) : (
          <div className="image-upload__placeholder">
            <span className="image-upload__icon" aria-hidden="true">
              &#9634;
            </span>
            <p>Drag a photo here</p>
            <span>JPG, PNG or WEBP &middot; up to {formatSize(MAX_BYTES)}</span>
          </div>
        )}
      </div>

      <div className="image-upload__actions">
        <Button
          type="button"
          variant={previewUrl ? "ghost" : "secondary"}
          size="small"
          onClick={() => filePickerRef.current.click()}
        >
          {previewUrl ? "Choose a different photo" : "Browse files"}
        </Button>
        {file && <span className="image-upload__meta">{file.name}</span>}
      </div>

      <p className="field__help">{error || hint}</p>
    </div>
  );
};

export default ImageUpload;
