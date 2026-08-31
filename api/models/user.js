const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 60 },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true, minlength: 6 },
    image: { type: String, required: true },
    imagePublicId: { type: String, default: null },

    // Places this user contributed.
    places: [{ type: mongoose.Types.ObjectId, ref: "Place" }],

    /**
     * The visitor's own lists. Stored as references on the user rather than as
     * a separate join collection: a person tracks tens of places, not
     * thousands, so an array is the simpler and faster shape here.
     */
    visited: [{ type: mongoose.Types.ObjectId, ref: "Place" }],
    wishlist: [{ type: mongoose.Types.ObjectId, ref: "Place" }],
  },
  { timestamps: true }
);

// Never let a password hash leave the API, whatever the caller selects.
userSchema.set("toObject", {
  getters: true,
  transform: (doc, ret) => {
    delete ret.password;
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model("User", userSchema);
