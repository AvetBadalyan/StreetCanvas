const mongoose = require("mongoose");

const HttpError = require("../models/http-error");
const getCoordsForAddress = require("../util/location");
const Place = require("../models/place");
const User = require("../models/user");
const asyncHandler = require("../util/async-handler");
const { normalizeTags } = require("../util/tags");
const { saveImage, destroyImage } = require("../util/image-store");
const {
  escapeRegex,
  parsePagination,
  buildPaginationMeta,
  parseNearby,
} = require("../util/query");

const { CATEGORIES } = Place;

const CREATOR_FIELDS = "name image";

// Mirrored by SORT_OPTIONS in the frontend's PlaceFilters component. An unknown
// value falls back to `recent`.
const SORT_OPTIONS = {
  recent: { createdAt: -1 },
  oldest: { createdAt: 1 },
  title: { title: 1 },
};

/** Turns the query string into a mongo filter shared by every listing route. */
const buildFilter = (query) => {
  const filter = {};

  if (query.q) {
    // A regex across several fields cannot use an index, so this is a
    // collection scan. Fine at this project's scale; a text index would be the
    // next step, at the cost of losing substring matching.
    const term = new RegExp(escapeRegex(query.q.trim()), "i");
    filter.$or = [
      { title: term },
      { region: term },
      { description: term },
      { tags: term },
    ];
  }

  if (query.tag) {
    const tags = normalizeTags(query.tag);
    if (tags.length) filter.tags = { $all: tags };
  }

  if (query.category && CATEGORIES.includes(query.category)) {
    filter.category = query.category;
  }

  return filter;
};

/**
 * GET /api/places
 *
 * Public catalogue. Two modes:
 *   - default: filtered, sorted, paginated
 *   - `?near=lat,lng&radius=km`: nearest first, with the distance to each
 *
 * The nearby mode is what makes this app useful rather than browsable - it
 * answers "what can I see from where I am standing".
 */
const getPlaces = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const filter = buildFilter(req.query);
  const nearby = parseNearby(req.query);

  if (nearby) {
    // $geoNear must be the first stage of the pipeline, and it both sorts by
    // distance and reports it - which a plain find() cannot do.
    const [result] = await Place.aggregate([
      {
        $geoNear: {
          near: { type: "Point", coordinates: [nearby.lng, nearby.lat] },
          distanceField: "distanceMeters",
          maxDistance: nearby.radiusMeters,
          query: filter,
          spherical: true,
        },
      },
      {
        $facet: {
          places: [
            { $skip: skip },
            { $limit: limit },
            {
              $lookup: {
                from: "users",
                localField: "creator",
                foreignField: "_id",
                as: "creator",
                pipeline: [{ $project: { name: 1, image: 1 } }],
              },
            },
            { $unwind: "$creator" },
          ],
          total: [{ $count: "value" }],
        },
      },
    ]);

    const total = result.total[0]?.value ?? 0;

    return res.json({
      places: result.places.map(shapeAggregated),
      pagination: buildPaginationMeta({ page, limit, total }),
      near: nearby,
    });
  }

  const [places, total] = await Promise.all([
    Place.find(filter)
      .sort(SORT_OPTIONS[req.query.sort] || SORT_OPTIONS.recent)
      .skip(skip)
      .limit(limit)
      .populate("creator", CREATOR_FIELDS),
    Place.countDocuments(filter),
  ]);

  res.json({
    places: places.map((place) => place.toObject({ getters: true })),
    pagination: buildPaginationMeta({ page, limit, total }),
  });
});

/**
 * Aggregation output bypasses the schema's toObject transform, so the same
 * reshaping has to happen by hand for the $geoNear path.
 */
const shapeAggregated = (doc) => {
  const [lng, lat] = doc.location?.coordinates || [];
  // Built by hand rather than spread from `doc`, so this matches the plain
  // find() path exactly - no internal `distanceMeters` or duplicated `_id`.
  return {
    id: doc._id.toString(),
    title: doc.title,
    description: doc.description,
    category: doc.category,
    region: doc.region,
    year: doc.year,
    tags: doc.tags,
    image: doc.image,
    location: { lat, lng },
    sourceName: doc.sourceName,
    sourceUrl: doc.sourceUrl,
    creator: { ...doc.creator, id: doc.creator._id.toString() },
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    distanceKm: Math.round((doc.distanceMeters / 1000) * 10) / 10,
  };
};

/**
 * GET /api/places/facets
 * Tag and category counts that drive the filter chips, so the UI never offers a
 * filter that would return nothing.
 */
const getFacets = asyncHandler(async (req, res) => {
  const [tags, categories, regions] = await Promise.all([
    Place.aggregate([
      { $unwind: "$tags" },
      { $group: { _id: "$tags", count: { $sum: 1 } } },
      { $sort: { count: -1, _id: 1 } },
      { $limit: 24 },
    ]),
    Place.aggregate([
      { $group: { _id: "$category", count: { $sum: 1 } } },
      { $sort: { count: -1, _id: 1 } },
    ]),
    Place.aggregate([
      { $group: { _id: "$region", count: { $sum: 1 } } },
      { $sort: { count: -1, _id: 1 } },
      { $limit: 12 },
    ]),
  ]);

  // Every place has exactly one category, so the counts already sum to the
  // collection total - no separate countDocuments needed.
  const total = categories.reduce((sum, { count }) => sum + count, 0);

  // Counts only move when someone adds or removes a place, so a short shared
  // cache saves a function invocation on most page loads.
  res.set("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
  res.json({
    tags: tags.map(({ _id, count }) => ({ tag: _id, count })),
    categories: categories.map(({ _id, count }) => ({ category: _id, count })),
    regions: regions.map(({ _id, count }) => ({ region: _id, count })),
    total,
  });
});

const getPlaceById = asyncHandler(async (req, res, next) => {
  const place = await Place.findById(req.params.pid).populate(
    "creator",
    CREATOR_FIELDS
  );

  if (!place) {
    return next(new HttpError("Could not find a place for that id.", 404));
  }

  res.json({ place: place.toObject({ getters: true }) });
});

/**
 * GET /api/places/user/:uid
 * Returns an empty list for a contributor with no places yet, rather than a
 * 404 - an empty profile is a normal state, not an error.
 */
const getPlacesByUserId = asyncHandler(async (req, res, next) => {
  const userId = req.params.uid;
  const { page, limit, skip } = parsePagination(req.query);

  const [user, places, total] = await Promise.all([
    User.findById(userId).select(CREATOR_FIELDS),
    Place.find({ creator: userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Place.countDocuments({ creator: userId }),
  ]);

  if (!user) {
    return next(new HttpError("Could not find that contributor.", 404));
  }

  const creator = user.toObject({ getters: true });

  res.json({
    user: creator,
    // Not populated: every place here has the same creator, which is the
    // document already being fetched alongside.
    places: places.map((place) => ({
      ...place.toObject({ getters: true }),
      creator,
    })),
    pagination: buildPaginationMeta({ page, limit, total }),
  });
});

const createPlace = asyncHandler(async (req, res, next) => {
  // multer runs before the validators, so a missing file reaches us as an
  // absent `req.file` rather than a validation error.
  if (!req.file) {
    return next(new HttpError("A photo of the place is required.", 422));
  }

  const { title, description, address, region, category, tags } = req.body;

  // Geocoded before the image is stored, so an address we cannot place costs
  // nothing to reject.
  const coordinates = await getCoordsForAddress(address);

  const user = await User.findById(req.userData.userId);
  if (!user) {
    return next(new HttpError("Could not find the user for this token.", 404));
  }

  // Everything that could reject has now been checked, so this is the first
  // point at which storing the file is worthwhile.
  const image = await saveImage(req.file);

  const createdPlace = new Place({
    title,
    description,
    category,
    region: region?.trim() || "Armenia",
    tags: normalizeTags(tags),
    location: Place.toGeoPoint(coordinates),
    image: image.url,
    imagePublicId: image.publicId,
    creator: req.userData.userId,
  });

  // The place document and the owner's reference to it must land together,
  // otherwise a crash between the two writes leaves a dangling reference.
  const session = await mongoose.startSession();
  try {
    session.startTransaction();
    await createdPlace.save({ session });
    user.places.push(createdPlace);
    await user.save({ session });
    await session.commitTransaction();
  } catch (err) {
    await session.abortTransaction();
    // The image is already in Cloudinary but the database write was rolled
    // back, so remove it rather than leaving an asset nothing points at.
    await destroyImage(image);
    throw err;
  } finally {
    await session.endSession();
  }

  await createdPlace.populate("creator", CREATOR_FIELDS);

  res.status(201).json({ place: createdPlace.toObject({ getters: true }) });
});

const updatePlace = asyncHandler(async (req, res, next) => {
  const { title, description, region, category, tags } = req.body;

  const place = await Place.findById(req.params.pid);

  if (!place) {
    return next(new HttpError("Could not find a place for that id.", 404));
  }

  if (place.creator.toString() !== req.userData.userId) {
    return next(new HttpError("You are not allowed to edit this place.", 403));
  }

  if (title !== undefined) place.title = title;
  if (description !== undefined) place.description = description;
  if (region !== undefined) place.region = region.trim() || "Armenia";
  if (category !== undefined) place.category = category;
  if (tags !== undefined) place.tags = normalizeTags(tags);

  await place.save();
  await place.populate("creator", CREATOR_FIELDS);

  res.status(200).json({ place: place.toObject({ getters: true }) });
});

const deletePlace = asyncHandler(async (req, res, next) => {
  const placeId = req.params.pid;

  // Not populated: the owner is only needed to compare an id and to pull one
  // reference, neither of which requires loading the whole user document.
  const place = await Place.findById(placeId);

  if (!place) {
    return next(new HttpError("Could not find a place for that id.", 404));
  }

  if (place.creator.toString() !== req.userData.userId) {
    return next(new HttpError("You are not allowed to delete this place.", 403));
  }

  const image = { url: place.image, publicId: place.imagePublicId };

  const session = await mongoose.startSession();
  try {
    session.startTransaction();
    await place.deleteOne({ session });
    await User.updateOne(
      { _id: place.creator },
      { $pull: { places: placeId } },
      { session }
    );
    // A deleted place must not linger on anyone's saved lists.
    await User.updateMany(
      { $or: [{ visited: placeId }, { wishlist: placeId }] },
      { $pull: { visited: placeId, wishlist: placeId } },
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

  res.status(200).json({ message: "Place deleted." });
});

module.exports = {
  getPlaces,
  getFacets,
  getPlaceById,
  getPlacesByUserId,
  createPlace,
  updatePlace,
  deletePlace,
};
