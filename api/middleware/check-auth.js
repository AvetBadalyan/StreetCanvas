const jwt = require("jsonwebtoken");

const HttpError = require("../models/http-error");

module.exports = (req, res, next) => {
  // The CORS preflight never carries the Authorization header.
  if (req.method === "OPTIONS") {
    return next();
  }

  const header = req.headers.authorization || "";
  const [scheme, token] = header.split(" ");

  if (scheme !== "Bearer" || !token) {
    return next(new HttpError("You need to be signed in to do that.", 401));
  }

  try {
    const decodedToken = jwt.verify(token, process.env.JWT_KEY);
    req.userData = { userId: decodedToken.userId, email: decodedToken.email };
    next();
  } catch (err) {
    // 401 rather than 403: the credential is missing or stale, so the client
    // should re-authenticate instead of treating it as a permission problem.
    const message =
      err.name === "TokenExpiredError"
        ? "Your session has expired, please sign in again."
        : "Authentication failed.";
    return next(new HttpError(message, 401));
  }
};
