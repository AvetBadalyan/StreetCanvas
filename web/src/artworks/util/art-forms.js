// Mirrors the server's ART_FORMS enum in models/artwork.js, which is the source
// of truth and rejects anything outside it. Kept as a single list here so the
// filter bar and the create/edit form cannot drift apart from each other.
export const ART_FORMS = [
  { value: "mural", label: "Mural" },
  { value: "stencil", label: "Stencil" },
  { value: "graffiti", label: "Graffiti" },
  { value: "paste-up", label: "Paste-up" },
  { value: "sticker", label: "Sticker" },
  { value: "mosaic", label: "Mosaic" },
  { value: "installation", label: "Installation" },
  { value: "other", label: "Other" },
];

// Falls back to the raw value rather than "Other": if the two lists ever drift,
// showing the unknown slug is more honest than filing it under a real category.
export const labelForForm = (value) =>
  ART_FORMS.find((form) => form.value === value)?.label || value;
