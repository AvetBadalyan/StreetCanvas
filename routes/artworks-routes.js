const express = require("express");
const { check, body } = require("express-validator");

const artworksControllers = require("../controllers/artworks-controllers");
const checkAuth = require("../middleware/check-auth");
const fileUpload = require("../middleware/file-Upload");
const validateRequest = require("../middleware/validate-request");
const validateObjectId = require("../middleware/validate-object-id");
const { uploadLimiter } = require("../middleware/rate-limit");
const Artwork = require("../models/artwork");

const router = express.Router();

// Shared by create and update. The route owns the wording of every rejection;
// the schema in models/artwork.js is the last-resort integrity net.
const artworkBodyRules = [
  check("title")
    .trim()
    .isLength({ min: 3, max: 80 })
    .withMessage("Title must be between 3 and 80 characters."),
  check("description")
    .trim()
    .isLength({ min: 10, max: 2000 })
    .withMessage("The story must be between 10 and 2000 characters."),
  body("artist")
    .optional()
    .trim()
    .isLength({ max: 80 })
    .withMessage("Artist name is too long."),
  body("form")
    .optional()
    .isIn(Artwork.ART_FORMS)
    .withMessage("Unknown art form."),
];

// Public reads. `/facets` is declared before `/:aid` so it is not swallowed by
// the id parameter.
router.get("/", artworksControllers.getArtworks);
router.get("/facets", artworksControllers.getFacets);
router.get(
  "/user/:uid",
  validateObjectId("uid", "contributor"),
  artworksControllers.getArtworksByUserId
);
router.get(
  "/:aid",
  validateObjectId("aid", "artwork"),
  artworksControllers.getArtworkById
);

router.use(checkAuth);

router.post(
  "/",
  uploadLimiter,
  // multer has to parse the multipart body before the validators can see any
  // of these fields.
  fileUpload.single("image"),
  [
    ...artworkBodyRules,
    check("address")
      .trim()
      .isLength({ min: 3, max: 200 })
      .withMessage("Please enter the street or place where you found it."),
  ],
  validateRequest,
  artworksControllers.createArtwork
);

router.patch(
  "/:aid",
  validateObjectId("aid", "artwork"),
  artworkBodyRules,
  validateRequest,
  artworksControllers.updateArtwork
);

router.delete(
  "/:aid",
  validateObjectId("aid", "artwork"),
  artworksControllers.deleteArtwork
);

module.exports = router;
