const express = require("express");
const { check } = require("express-validator");

const usersControllers = require("../controllers/users-controllers");
const fileUpload = require("../middleware/file-Upload");
const validateRequest = require("../middleware/validate-request");
const { authLimiter } = require("../middleware/rate-limit");

const router = express.Router();

const emailRule = check("email")
  .trim()
  .isEmail()
  .withMessage("Please enter a valid email address.")
  .normalizeEmail();

router.get("/", usersControllers.getUsers);

router.post(
  "/signup",
  authLimiter,
  fileUpload.single("image"),
  [
    check("name")
      .trim()
      .isLength({ min: 2, max: 60 })
      .withMessage("Please enter your name."),
    emailRule,
    check("password")
      .isLength({ min: 6, max: 100 })
      .withMessage("Password must be at least 6 characters."),
  ],
  validateRequest,
  usersControllers.signup
);

router.post(
  "/login",
  authLimiter,
  [emailRule, check("password").notEmpty().withMessage("Please enter your password.")],
  validateRequest,
  usersControllers.login
);

module.exports = router;
