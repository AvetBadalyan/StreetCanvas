/**
 * Wraps an async route handler so a rejected promise reaches Express.
 *
 * Express 4 does not await handlers, so an unhandled rejection would hang the
 * request. Wrapping here means a handler only needs its own try/catch where it
 * has something specific to say about the failure - everything else falls
 * through to the global error handler as a 500.
 */
const asyncHandler = (handler) => (req, res, next) =>
  Promise.resolve(handler(req, res, next)).catch(next);

module.exports = asyncHandler;
