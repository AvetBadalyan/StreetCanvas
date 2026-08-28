const multer = require("multer");

const { MIME_TYPE_MAP } = require("../util/image-store");

// Vercel caps a serverless function's request body at 4.5 MB, so anything
// larger is rejected by the platform before multer ever sees it.
// Mirrored by MAX_BYTES in the frontend's ImageUpload component.
const MAX_FILE_SIZE_BYTES = 4 * 1024 * 1024; // 4 MB

/**
 * Parses a single `image` field out of a multipart request.
 *
 * The file is held in memory, not written anywhere: the controller decides
 * whether to keep it once the rest of the request has been validated. At a 4 MB
 * cap that is a few megabytes of RAM for the life of one request, and it means
 * a rejected upload never leaves a file behind.
 */
const fileUpload = multer({
  storage: multer.memoryStorage(),
  // `limits` takes an options object - passing a bare number (the shape this
  // file used to have) silently applies no limit at all.
  limits: { fileSize: MAX_FILE_SIZE_BYTES, files: 1 },
  fileFilter: (req, file, cb) => {
    const isValid = !!MIME_TYPE_MAP[file.mimetype];
    cb(
      isValid ? null : new Error("Only PNG, JPG and WEBP images are allowed."),
      isValid
    );
  },
});

module.exports = fileUpload;
module.exports.MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_BYTES;
