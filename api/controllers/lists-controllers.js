const HttpError = require("../models/http-error");
const User = require("../models/user");
const Place = require("../models/place");
const asyncHandler = require("../util/async-handler");

// The two lists a visitor keeps. Named here so the route can validate the
// parameter against them and neither file hardcodes the strings twice.
const LISTS = ["visited", "wishlist"];

/**
 * GET /api/me/lists
 * The signed-in visitor's saved places, in full so the UI can render cards
 * without a second round trip.
 */
const getMyLists = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.userData.userId)
    .populate("visited")
    .populate("wishlist");

  if (!user) {
    return next(new HttpError("Could not find your account.", 404));
  }

  const shape = (places) =>
    places.map((place) => place.toObject({ getters: true }));

  res.json({
    visited: shape(user.visited),
    wishlist: shape(user.wishlist),
  });
});

/**
 * PUT /api/me/lists/:list/:pid
 * Adds a place to `visited` or `wishlist`, and removes it from the other -
 * somewhere you have been is no longer somewhere you want to go.
 *
 * Idempotent: $addToSet means repeating the call is harmless, so a double tap
 * or a retried request cannot produce duplicates.
 */
const addToList = asyncHandler(async (req, res, next) => {
  const { list, pid } = req.params;
  const other = list === "visited" ? "wishlist" : "visited";

  if (!(await Place.exists({ _id: pid }))) {
    return next(new HttpError("Could not find a place for that id.", 404));
  }

  await User.updateOne(
    { _id: req.userData.userId },
    { $addToSet: { [list]: pid }, $pull: { [other]: pid } }
  );

  res.json({ place: pid, list });
});

/** DELETE /api/me/lists/:list/:pid */
const removeFromList = asyncHandler(async (req, res) => {
  const { list, pid } = req.params;

  await User.updateOne(
    { _id: req.userData.userId },
    { $pull: { [list]: pid } }
  );

  res.json({ place: pid, list: null });
});

module.exports = { getMyLists, addToList, removeFromList, LISTS };
