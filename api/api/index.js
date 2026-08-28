/**
 * Vercel serverless entry point.
 *
 * Vercel treats every file under `api/` as a function and invokes the default
 * export with (req, res) - an Express app is already that shape, so the whole
 * API runs as a single function with `vercel.json` rewriting all paths here.
 *
 * The app deliberately does not call `listen()`; the platform owns the socket.
 */

module.exports = require("../app");
