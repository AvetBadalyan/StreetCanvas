// Mirrors the server's CATEGORIES enum in models/place.js, which is the source
// of truth and rejects anything outside it. Kept as a single list here so the
// filter bar and the add/edit form cannot drift apart from each other.
export const CATEGORIES = [
  { value: "monastery", label: "Monastery" },
  { value: "church", label: "Church" },
  { value: "fortress", label: "Fortress" },
  { value: "archaeological", label: "Archaeological site" },
  { value: "museum", label: "Museum" },
  { value: "mountain", label: "Mountain" },
  { value: "lake", label: "Lake" },
  { value: "waterfall", label: "Waterfall" },
  { value: "cave", label: "Cave" },
  { value: "other", label: "Other" },
];

// Falls back to the raw slug rather than "Other" - see NOTES.md.
export const labelForCategory = (value) =>
  CATEGORIES.find((category) => category.value === value)?.label || value;
