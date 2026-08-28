require("dotenv").config();

const path = require("path");

const express = require("express");
const mongoose = require("mongoose");
const helmet = require("helmet");
const cors = require("cors");
const morgan = require("morgan");
const multer = require("multer");

const artworksRoutes = require("./routes/artworks-routes");
const usersRoutes = require("./routes/users-routes");
const HttpError = require("./models/http-error");
const { apiLimiter } = require("./middleware/rate-limit");
const { connectToDatabase } = require("./util/db");
const { MAX_FILE_SIZE_BYTES } = require("./middleware/file-Upload");
const { formatBytes } = require("./util/format");
const { isCloudinaryEnabled, LOCAL_UPLOAD_DIR } = require("./util/image-store");

const REQUIRED_ENV = ["MONGO_URI", "JWT_KEY"];
const missingEnv = REQUIRED_ENV.filter((key) => !process.env[key]);
if (missingEnv.length) {
  console.error(
    `Missing required environment variables: ${missingEnv.join(", ")}.\n` +
      "Copy .env.example to .env and fill it in."
  );
  process.exit(1);
}

const app = express();

// Behind Vercel's and Render's proxies, so the rate limiter sees the real
// client address rather than the proxy's.
app.set("trust proxy", 1);

app.use(
  helmet({
    // Locally uploaded images are served from this origin but embedded by the
    // frontend on another one.
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

const allowedOrigins = (process.env.CORS_ORIGIN || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow non-browser clients (curl, uptime checks) which send no Origin,
      // and fall back to permissive mode when no allowlist is configured.
      if (!origin || allowedOrigins.length === 0) return callback(null, true);
      return allowedOrigins.includes(origin)
        ? callback(null, true)
        : callback(new Error(`Origin ${origin} is not allowed by CORS.`));
    },
  })
);

app.use(morgan(process.env.NODE_ENV === "production" ? "tiny" : "dev"));
app.use(express.json({ limit: "1mb" }));

// Only reachable when running on a host with a writable disk; on Vercel every
// upload goes to Cloudinary instead.
app.use("/uploads/images", express.static(path.join(LOCAL_UPLOAD_DIR)));

/**
 * Liveness probe, deliberately declared before the database guard so it answers
 * while the connection is still being established. The frontend calls this on
 * load to warm the instance up and to tell "still booting" apart from "broken".
 */
app.get("/api/health", (req, res) => {
  // Start the connection without waiting for it: the probe's whole purpose is
  // to warm a cold instance, and answering while the pool opens in the
  // background means the client's next request finds it ready.
  connectToDatabase().catch(() => {});

  const dbStates = ["disconnected", "connected", "connecting", "disconnecting"];
  res.json({
    status: "ok",
    db: dbStates[mongoose.connection.readyState] || "unknown",
    imageStore: isCloudinaryEnabled ? "cloudinary" : "local-disk",
    uptime: Math.round(process.uptime()),
  });
});

app.use("/api", apiLimiter);

// Every data route needs a live connection. In serverless this resolves
// instantly on a warm instance and does the real work on a cold one.
app.use("/api", async (req, res, next) => {
  try {
    await connectToDatabase();
    next();
  } catch (err) {
    console.error("[db] connection failed:", err.message);
    next(new HttpError("The database is unavailable. Please try again.", 503));
  }
});

app.use("/api/artworks", artworksRoutes);
app.use("/api/users", usersRoutes);

app.use((req, res, next) => {
  next(new HttpError(`Could not find ${req.method} ${req.originalUrl}.`, 404));
});

// Uploads are held in memory and only stored once a request has passed
// validation (see util/image-store.js), so there is nothing to clean up here.
app.use((error, req, res, next) => {
  if (res.headersSent) {
    return next(error);
  }

  if (error instanceof multer.MulterError) {
    const message =
      error.code === "LIMIT_FILE_SIZE"
        ? `That image is too large. Please use a file under ${formatBytes(
            MAX_FILE_SIZE_BYTES
          )}.`
        : "The upload could not be processed.";
    return res.status(413).json({ message });
  }

  // Only HttpError carries a status. Reading a status off any error would be
  // unsafe: Mongo puts its own codes on `err.code` (11000 for a duplicate key).
  const status = error instanceof HttpError ? error.status : 500;
  if (status >= 500) {
    // A deliberate HttpError already carries everything worth knowing; only an
    // unexpected throw is worth a full stack trace.
    console.error("[error]", error instanceof HttpError ? error.message : error);
  }

  res.status(status).json({
    message: error.message || "An unknown error occurred!",
  });
});

module.exports = app;
