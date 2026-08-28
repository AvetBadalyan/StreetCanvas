const rateLimit = require("express-rate-limit");

const HttpError = require("../models/http-error");

// express-rate-limit writes its own response by default, which would bypass the
// app's error handler and return a different body shape than every other error.
const handler = (message) => (req, res, next) => next(new HttpError(message, 429));

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  handler: handler("Too many requests. Please slow down and try again shortly."),
});

// Credential endpoints get a much tighter budget: this is a public demo, so
// brute-forcing a login is the realistic abuse case.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  handler: handler("Too many attempts. Please try again in 15 minutes."),
});

// Uploads are the expensive path (geocoding + Cloudinary), so cap them per user.
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 30,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  handler: handler("You have added a lot of artworks in a short time. Please try again later."),
});

module.exports = { apiLimiter, authLimiter, uploadLimiter };
