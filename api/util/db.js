const mongoose = require("mongoose");

/**
 * Connection caching for a serverless runtime.
 *
 * On Vercel each request may hit a fresh function instance, and opening a new
 * MongoDB connection per invocation exhausts the Atlas connection limit fast.
 * The handle is stashed on `global`, which survives between invocations that
 * reuse a warm instance, so we connect roughly once per instance rather than
 * once per request.
 */
const cache = global.__wanderArmeniaMongoose || { promise: null };
global.__wanderArmeniaMongoose = cache;

// The promise is cached rather than the resolved connection: awaiting a settled
// promise costs a microtask, so a second field would earn nothing.
const connectToDatabase = () => {
  if (!cache.promise) {
    cache.promise = mongoose
      .connect(process.env.MONGO_URI, {
        // Fail fast instead of queueing operations against a dead connection -
        // in serverless a hung query burns the whole function timeout.
        bufferCommands: false,
        serverSelectionTimeoutMS: 8000,
        // Many short-lived instances, so keep each pool small.
        maxPoolSize: 5,
      })
      .then((mongooseInstance) => mongooseInstance.connection);

    // A failed attempt must not stay cached, or every later request reuses the
    // rejected promise and the instance can never recover.
    cache.promise.catch(() => {
      cache.promise = null;
    });
  }

  return cache.promise;
};

module.exports = { connectToDatabase };
