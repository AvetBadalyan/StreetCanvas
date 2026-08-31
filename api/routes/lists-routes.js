const express = require("express");
const { param } = require("express-validator");

const listsControllers = require("../controllers/lists-controllers");
const checkAuth = require("../middleware/check-auth");
const validateRequest = require("../middleware/validate-request");
const validateObjectId = require("../middleware/validate-object-id");

const router = express.Router();

// Everything here is personal to the signed-in visitor.
router.use(checkAuth);

const validateList = [
  param("list")
    .isIn(listsControllers.LISTS)
    .withMessage("Unknown list. Use 'visited' or 'wishlist'."),
];

router.get("/lists", listsControllers.getMyLists);

router.put(
  "/lists/:list/:pid",
  validateList,
  validateRequest,
  validateObjectId("pid", "place"),
  listsControllers.addToList
);

router.delete(
  "/lists/:list/:pid",
  validateList,
  validateRequest,
  validateObjectId("pid", "place"),
  listsControllers.removeFromList
);

module.exports = router;
