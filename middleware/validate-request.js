const { validationResult } = require("express-validator");

const HttpError = require("../models/http-error");

/**
 * Turns express-validator's result into a 422.
 *
 * Placed after the validation chain on a route, so controllers never repeat the
 * same `validationResult(req)` / build-a-message / `next()` preamble. The first
 * failure wins: the messages are written per-field and showing one at a time is
 * how the form renders them anyway.
 */
const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) {
    return next();
  }

  const [first] = errors.array();
  return next(
    new HttpError(
      first?.msg || "Invalid inputs passed, please check your data.",
      422
    )
  );
};

module.exports = validateRequest;
