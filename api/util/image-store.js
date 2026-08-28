const fs = require("fs/promises");
const path = require("path");

const { v4: uuid } = require("uuid");

const HttpError = require("../models/http-error");

/**
 * Where uploaded images go.
 *
 * Cloudinary in production, the local disk when no Cloudinary keys are set, so
 * the API still runs without a third-party account. Both hosts we deploy to
 * have an ephemeral filesystem - anything written to ./uploads is wiped on the
 * next restart - so disk storage is a development convenience only.
 */

// Mirrored by ACCEPTED in the frontend's ImageUpload component.
const MIME_TYPE_MAP = {
  "image/png": "png",
  "image/jpeg": "jpeg",
  "image/jpg": "jpg",
  "image/webp": "webp",
};

const LOCAL_UPLOAD_DIR = path.join("uploads", "images");

const isCloudinaryEnabled = Boolean(
  process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
);

let configured = null;

// Loaded on first use rather than at startup: the SDK costs ~110ms to require,
// and read-only requests should not pay that on a cold serverless instance.
const getCloudinary = () => {
  if (!configured) {
    configured = require("cloudinary").v2;
    configured.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
      secure: true,
    });
  }
  return configured;
};

const uploadToCloudinary = (buffer) =>
  new Promise((resolve, reject) => {
    const stream = getCloudinary().uploader.upload_stream(
      {
        folder: "streetcanvas",
        public_id: uuid(),
        resource_type: "image",
        // Cap the stored resolution and let Cloudinary pick the best codec, so
        // a 12 MP phone photo is not shipped to every visitor untouched.
        transformation: [
          { width: 1600, height: 1600, crop: "limit" },
          { quality: "auto" },
          { fetch_format: "auto" },
        ],
      },
      (error, result) =>
        error
          ? reject(error)
          : resolve({ url: result.secure_url, publicId: result.public_id })
    );
    stream.end(buffer);
  });

const saveToDisk = async (file) => {
  const filename = `${uuid()}.${MIME_TYPE_MAP[file.mimetype]}`;
  try {
    await fs.mkdir(LOCAL_UPLOAD_DIR, { recursive: true });
    await fs.writeFile(path.join(LOCAL_UPLOAD_DIR, filename), file.buffer);
  } catch (err) {
    // A serverless filesystem is read-only, so this path cannot work in
    // production. Say so plainly instead of surfacing an EROFS stack trace.
    throw new HttpError(
      "Image uploads are not configured on this server. Set the CLOUDINARY_* environment variables.",
      503
    );
  }
  return { url: `/uploads/images/${filename}`, publicId: null };
};

/**
 * Stores an uploaded file and returns `{ url, publicId }`.
 *
 * Called explicitly by the controller once validation has passed, so a rejected
 * request never uploads anything that would then need cleaning up.
 */
const saveImage = (file) =>
  isCloudinaryEnabled ? uploadToCloudinary(file.buffer) : saveToDisk(file);

/**
 * Removes a stored image. Best effort: an orphaned file is not worth failing
 * the caller's request over, so this never rejects.
 */
const destroyImage = async ({ url, publicId }) => {
  try {
    if (publicId) {
      await getCloudinary().uploader.destroy(publicId);
      return;
    }
    if (url && url.startsWith("/uploads/images/")) {
      await fs.unlink(path.join(LOCAL_UPLOAD_DIR, path.basename(url)));
    }
  } catch (err) {
    console.error(`[image-store] could not delete image: ${err.message}`);
  }
};

module.exports = {
  MIME_TYPE_MAP,
  LOCAL_UPLOAD_DIR,
  isCloudinaryEnabled,
  saveImage,
  destroyImage,
};
