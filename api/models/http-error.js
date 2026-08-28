/**
 * An error carrying the HTTP status to respond with.
 *
 * The status lives on `status`, not `code`: Mongo puts its own numeric codes on
 * `err.code` (a duplicate key is 11000), so a driver error reaching the global
 * handler would otherwise be passed straight to `res.status(11000)` and throw a
 * RangeError instead of returning a 500.
 */
class HttpError extends Error {
  constructor(message, status = 500) {
    super(message);
    this.name = "HttpError";
    this.status = status;
  }
}

module.exports = HttpError;
