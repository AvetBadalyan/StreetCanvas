const express = require("express");
const { check, body } = require("express-validator");

const placesControllers = require("../controllers/places-controllers");
const checkAuth = require("../middleware/check-auth");
const fileUpload = require("../middleware/file-upload");
const validateRequest = require("../middleware/validate-request");
const validateObjectId = require("../middleware/validate-object-id");
const { uploadLimiter } = require("../middleware/rate-limit");
const Place = require("../models/place");

const router = express.Router();

// Shared by create and update. `.optional()` lets PATCH send only the fields
// that changed; POST adds its own `.notEmpty()` checks below so a place can
// never be created without a title and description.
const placeBodyRules = [
  check("title")
    .optional()
    .trim()
    .isLength({ min: 3, max: 80 })
    .withMessage("Title must be between 3 and 80 characters."),
  check("description")
    .optional()
    .trim()
    .isLength({ min: 10, max: 2000 })
    .withMessage("The description must be between 10 and 2000 characters."),
  body("region")
    .optional()
    .trim()
    .isLength({ max: 80 })
    .withMessage("Region name is too long."),
  body("category")
    .optional()
    .isIn(Place.CATEGORIES)
    .withMessage("Unknown category."),
];

const requiredOnCreate = [
  check("title").notEmpty().withMessage("Title is required."),
  check("description").notEmpty().withMessage("Description is required."),
];

// Public reads. `/facets` is declared before `/:pid` so it is not swallowed by
// the id parameter.
router.get("/", placesControllers.getPlaces);
router.get("/facets", placesControllers.getFacets);
router.get(
  "/user/:uid",
  validateObjectId("uid", "contributor"),
  placesControllers.getPlacesByUserId
);
router.get(
  "/:pid",
  validateObjectId("pid", "place"),
  placesControllers.getPlaceById
);

router.use(checkAuth);

router.post(
  "/",
  uploadLimiter,
  // multer has to parse the multipart body before the validators can see any
  // of these fields.
  fileUpload.single("image"),
  [
    ...requiredOnCreate,
    ...placeBodyRules,
    check("address")
      .trim()
      .isLength({ min: 3, max: 200 })
      .withMessage("Please enter where this place is."),
  ],
  validateRequest,
  placesControllers.createPlace
);

router.patch(
  "/:pid",
  validateObjectId("pid", "place"),
  placeBodyRules,
  validateRequest,
  placesControllers.updatePlace
);

router.delete(
  "/:pid",
  validateObjectId("pid", "place"),
  placesControllers.deletePlace
);

module.exports = router;
