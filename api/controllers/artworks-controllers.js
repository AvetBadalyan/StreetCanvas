const mongoose = require("mongoose");

const HttpError = require("../models/http-error");
const getCoordsForAddress = require("../util/location");
const Artwork = require("../models/artwork");
const User = require("../models/user");
const asyncHandler = require("../util/async-handler");
const { normalizeTags } = require("../util/tags");
const { saveImage, destroyImage } = require("../util/image-store");
const {
  escapeRegex,
  parsePagination,
  buildPaginationMeta,
} = require("../util/query");

const { ART_FORMS } = Artwork;

const CREATOR_FIELDS = "name image";

// Mirrored by SORT_OPTIONS in the frontend's ArtworkFilters component. An
// unknown value falls back to `recent` rather than erroring.
const SORT_OPTIONS = {
  recent: { createdAt: -1 },
  oldest: { createdAt: 1 },
  title: { title: 1 },
};

/**
 * GET /api/artworks
 * Public explore feed: search, tag/form filters, pagination.
 */
const getArtworks = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const filter = {};

  if (req.query.q) {
    // A regex across several fields cannot use an index, so this is a
    // collection scan. Fine at this project's scale; a text index would be the
    // next step, at the cost of losing substring matching.
    const term = new RegExp(escapeRegex(req.query.q.trim()), "i");
    filter.$or = [
      { title: term },
      { artist: term },
      { address: term },
      { description: term },
      { tags: term },
    ];
  }

  if (req.query.tag) {
    const tags = normalizeTags(req.query.tag);
    if (tags.length) {
      filter.tags = { $all: tags };
    }
  }

  if (req.query.form && ART_FORMS.includes(req.query.form)) {
    filter.form = req.query.form;
  }

  const [artworks, total] = await Promise.all([
    Artwork.find(filter)
      .sort(SORT_OPTIONS[req.query.sort] || SORT_OPTIONS.recent)
      .skip(skip)
      .limit(limit)
      .populate("creator", CREATOR_FIELDS),
    Artwork.countDocuments(filter),
  ]);

  res.json({
    artworks: artworks.map((artwork) => artwork.toObject({ getters: true })),
    pagination: buildPaginationMeta({ page, limit, total }),
  });
});

/**
 * GET /api/artworks/facets
 * Tag and form counts that drive the filter chips, so the UI never offers a
 * filter that would return nothing.
 */
const getFacets = asyncHandler(async (req, res) => {
  const [tags, forms] = await Promise.all([
    Artwork.aggregate([
      { $unwind: "$tags" },
      { $group: { _id: "$tags", count: { $sum: 1 } } },
      { $sort: { count: -1, _id: 1 } },
      { $limit: 24 },
    ]),
    Artwork.aggregate([
      { $group: { _id: "$form", count: { $sum: 1 } } },
      { $sort: { count: -1, _id: 1 } },
    ]),
  ]);

  // Every artwork has exactly one form, so the form counts already sum to the
  // collection total - no separate countDocuments needed.
  const total = forms.reduce((sum, { count }) => sum + count, 0);

  // Counts only move when someone adds or removes an artwork, so a short shared
  // cache saves a function invocation on most page loads.
  res.set("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
  res.json({
    tags: tags.map(({ _id, count }) => ({ tag: _id, count })),
    forms: forms.map(({ _id, count }) => ({ form: _id, count })),
    total,
  });
});

const getArtworkById = asyncHandler(async (req, res, next) => {
  const artwork = await Artwork.findById(req.params.aid).populate(
    "creator",
    CREATOR_FIELDS
  );

  if (!artwork) {
    return next(new HttpError("Could not find an artwork for that id.", 404));
  }

  res.json({ artwork: artwork.toObject({ getters: true }) });
});

/**
 * GET /api/artworks/user/:uid
 * Returns an empty list for a contributor with no artworks yet. The previous
 * 404 here meant every newly registered user was greeted with an error screen.
 */
const getArtworksByUserId = asyncHandler(async (req, res, next) => {
  const userId = req.params.uid;
  const { page, limit, skip } = parsePagination(req.query);

  const [user, artworks, total] = await Promise.all([
    User.findById(userId).select(CREATOR_FIELDS),
    // Not populated: every artwork here has the same creator, which is the
    // document already being fetched alongside.
    Artwork.find({ creator: userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Artwork.countDocuments({ creator: userId }),
  ]);

  if (!user) {
    return next(new HttpError("Could not find that contributor.", 404));
  }

  const creator = user.toObject({ getters: true });

  res.json({
    user: creator,
    artworks: artworks.map((artwork) => ({
      ...artwork.toObject({ getters: true }),
      creator,
    })),
    pagination: buildPaginationMeta({ page, limit, total }),
  });
});

const createArtwork = asyncHandler(async (req, res, next) => {
  // multer runs before the validators, so a missing file reaches us as an
  // absent `req.file` rather than a validation error.
  if (!req.file) {
    return next(new HttpError("A photo of the artwork is required.", 422));
  }

  const { title, description, address, artist, form, tags } = req.body;

  // Geocoded before the image is stored, so an address we cannot place costs
  // nothing to reject. Throws an HttpError carrying its own status (422 for an
  // unknown address, 503 when the lookup service is down).
  const coordinates = await getCoordsForAddress(address);

  const user = await User.findById(req.userData.userId);
  if (!user) {
    return next(new HttpError("Could not find the user for this token.", 404));
  }

  // Everything that could reject has now been checked, so this is the first
  // point at which storing the file is worthwhile.
  const image = await saveImage(req.file);

  const createdArtwork = new Artwork({
    title,
    description,
    address,
    artist: artist?.trim() || "Unknown",
    form,
    tags: normalizeTags(tags),
    location: coordinates,
    image: image.url,
    imagePublicId: image.publicId,
    creator: req.userData.userId,
  });

  // The artwork document and the owner's reference to it must land together,
  // otherwise a crash between the two writes leaves a dangling reference.
  const session = await mongoose.startSession();
  try {
    session.startTransaction();
    await createdArtwork.save({ session });
    user.artworks.push(createdArtwork);
    await user.save({ session });
    await session.commitTransaction();
  } catch (err) {
    await session.abortTransaction();
    // The image is already in Cloudinary but the database write was rolled
    // back, so remove it rather than leaving an asset nothing points at.
    await destroyImage(image);
    throw err;
  } finally {
    // Sessions are a finite server resource; the original code leaked one per
    // request by never ending it.
    await session.endSession();
  }

  // Populated so every response shape carrying an artwork looks the same, and
  // the client never has to handle `creator` as either an object or an id.
  await createdArtwork.populate("creator", CREATOR_FIELDS);

  res.status(201).json({ artwork: createdArtwork.toObject({ getters: true }) });
});

const updateArtwork = asyncHandler(async (req, res, next) => {
  const { title, description, artist, form, tags } = req.body;

  const artwork = await Artwork.findById(req.params.aid);

  if (!artwork) {
    return next(new HttpError("Could not find an artwork for that id.", 404));
  }

  if (artwork.creator.toString() !== req.userData.userId) {
    return next(new HttpError("You are not allowed to edit this artwork.", 403));
  }

  artwork.title = title;
  artwork.description = description;
  if (artist !== undefined) artwork.artist = artist.trim() || "Unknown";
  if (form !== undefined) artwork.form = form;
  if (tags !== undefined) artwork.tags = normalizeTags(tags);

  await artwork.save();

  await artwork.populate("creator", CREATOR_FIELDS);

  res.status(200).json({ artwork: artwork.toObject({ getters: true }) });
});

const deleteArtwork = asyncHandler(async (req, res, next) => {
  const artworkId = req.params.aid;

  // Not populated: the owner is only needed to compare an id and to pull one
  // reference, neither of which requires loading the whole user document.
  const artwork = await Artwork.findById(artworkId);

  if (!artwork) {
    return next(new HttpError("Could not find an artwork for that id.", 404));
  }

  if (artwork.creator.toString() !== req.userData.userId) {
    return next(
      new HttpError("You are not allowed to delete this artwork.", 403)
    );
  }

  const image = { url: artwork.image, publicId: artwork.imagePublicId };

  const session = await mongoose.startSession();
  try {
    session.startTransaction();
    await artwork.deleteOne({ session });
    await User.updateOne(
      { _id: artwork.creator },
      { $pull: { artworks: artworkId } },
      { session }
    );
    await session.commitTransaction();
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    await session.endSession();
  }

  // Only drop the asset once the database change is durable, so a failed
  // transaction can never leave a record pointing at a deleted image.
  await destroyImage(image);

  res.status(200).json({ message: "Artwork deleted." });
});

module.exports = {
  getArtworks,
  getFacets,
  getArtworkById,
  getArtworksByUserId,
  createArtwork,
  updateArtwork,
  deleteArtwork,
};
