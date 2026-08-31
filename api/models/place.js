const mongoose = require("mongoose");

const Schema = mongoose.Schema;

// Closed vocabulary so the explore filters stay meaningful - free-text tags
// cover everything else.
const CATEGORIES = [
  "monastery",
  "church",
  "fortress",
  "archaeological",
  "museum",
  "mountain",
  "lake",
  "waterfall",
  "cave",
  "other",
];

const MAX_TAGS = 8;

const placeSchema = new Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 80 },
    description: { type: String, required: true, trim: true, maxlength: 2000 },
    category: { type: String, enum: CATEGORIES, default: "other", index: true },
    region: { type: String, trim: true, maxlength: 80, default: "Armenia" },
    // Year of construction where known. Null for natural features.
    year: { type: Number, default: null },
    tags: {
      type: [String],
      default: [],
      validate: {
        validator: (tags) => tags.length <= MAX_TAGS,
        message: `A place can have at most ${MAX_TAGS} tags.`,
      },
      index: true,
    },
    image: { type: String, required: true },
    // Cloudinary public_id, kept so the asset can be removed with the document.
    // Null for imported records and locally stored uploads.
    imagePublicId: { type: String, default: null },

    /**
     * GeoJSON, because "what is near me" is the app's central question and a
     * 2dsphere index answers it in the database rather than by loading every
     * document and measuring in JavaScript.
     *
     * Note the order: GeoJSON is [longitude, latitude], which is the reverse of
     * how coordinates are usually written. The toObject transform below hands
     * the client a plain { lat, lng } so nothing outside this file has to
     * remember that.
     */
    location: {
      type: { type: String, enum: ["Point"], default: "Point" },
      coordinates: {
        type: [Number],
        required: true,
        validate: {
          validator: (c) =>
            c.length === 2 &&
            c[0] >= -180 && c[0] <= 180 &&
            c[1] >= -90 && c[1] <= 90,
          message: "Coordinates must be [longitude, latitude] within range.",
        },
      },
    },

    // Where an imported record came from, so seeded entries credit their
    // source. Null for anything a contributor added through the app.
    sourceName: { type: String, default: null },
    sourceUrl: { type: String, default: null },

    creator: { type: mongoose.Types.ObjectId, required: true, ref: "User" },
  },
  { timestamps: true }
);

placeSchema.index({ location: "2dsphere" });
placeSchema.index({ createdAt: -1 });
placeSchema.index({ creator: 1, createdAt: -1 });

// Present coordinates to the API as { lat, lng } - the shape a reader expects -
// while storing the GeoJSON the index requires.
placeSchema.set("toObject", {
  getters: true,
  virtuals: true,
  transform: (doc, ret) => {
    const [lng, lat] = ret.location?.coordinates || [];
    ret.location = { lat, lng };
    delete ret.__v;
    return ret;
  },
});

/** Builds the stored shape from the { lat, lng } callers naturally have. */
placeSchema.statics.toGeoPoint = ({ lat, lng }) => ({
  type: "Point",
  coordinates: [lng, lat],
});

module.exports = mongoose.model("Place", placeSchema);
module.exports.CATEGORIES = CATEGORIES;
module.exports.MAX_TAGS = MAX_TAGS;
