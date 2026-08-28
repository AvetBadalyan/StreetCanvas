const mongoose = require("mongoose");

const Schema = mongoose.Schema;

// Closed vocabulary so the explore filters stay meaningful - free-text tags
// cover everything else.
const ART_FORMS = [
  "sculpture",
  "statue",
  "monument",
  "memorial",
  "mural",
  "fountain",
  "installation",
  "mosaic",
  "other",
];

const MAX_TAGS = 8;

const artworkSchema = new Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 80 },
    description: { type: String, required: true, trim: true, maxlength: 2000 },
    artist: { type: String, trim: true, maxlength: 80, default: "Unknown" },
    form: { type: String, enum: ART_FORMS, default: "mural", index: true },
    tags: {
      type: [String],
      default: [],
      validate: {
        validator: (tags) => tags.length <= MAX_TAGS,
        message: `An artwork can have at most ${MAX_TAGS} tags.`,
      },
      index: true,
    },
    image: { type: String, required: true },
    // Cloudinary public_id, kept so the asset can be removed with the document.
    // Null for locally stored uploads.
    imagePublicId: { type: String, default: null },
    address: { type: String, required: true, trim: true },
    // Where an imported record came from, so seeded entries can credit their
    // source. Null for anything a contributor added through the app.
    sourceName: { type: String, default: null },
    sourceUrl: { type: String, default: null },
    location: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
    },
    creator: { type: mongoose.Types.ObjectId, required: true, ref: "User" },
  },
  { timestamps: true }
);

// Explore feed sorts newest-first, and the "by contributor" view filters on
// creator - both are hot paths worth indexing.
artworkSchema.index({ createdAt: -1 });
artworkSchema.index({ creator: 1, createdAt: -1 });

module.exports = mongoose.model("Artwork", artworkSchema);
module.exports.ART_FORMS = ART_FORMS;
module.exports.MAX_TAGS = MAX_TAGS;
