const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 60 },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true, minlength: 6 },
    image: { type: String, required: true },
    imagePublicId: { type: String, default: null },
    artworks: [{ type: mongoose.Types.ObjectId, ref: "Artwork" }],
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
