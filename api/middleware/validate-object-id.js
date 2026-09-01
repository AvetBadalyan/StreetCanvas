const mongoose = require("mongoose");

const HttpError = require("../models/http-error");

/**
 * Rejects a malformed id before it reaches the database.
 *
 * `findById` throws a CastError on a non-ObjectId string, which would surface as
 * a 500 for what is really "no such thing". Answering 404 here keeps that check
 * out of every handler that takes an id.
 */
const validateObjectId = (paramName, label = "record") => (req, res, next) => {
  if (!mongoose.isValidObjectId(req.params[paramName])) {
    return next(new HttpError(`Could not find that ${label}.`, 404));
  }
  next();
};

module.exports = validateObjectId;
