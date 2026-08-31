/**
 * Entry point for running the API as a long-lived process (local development,
 * or any container host). The serverless deployment does not use this file -
 * see `api/index.js`.
 */

const app = require("./app");
const mongoose = require("mongoose");
const { connectToDatabase } = require("./util/db");

const PORT = process.env.PORT || 5000;

// Listen first, connect second, so the health probe answers as soon as the
// process is up rather than waiting on the database handshake. The previous
// version only called listen() inside the connect callback, which meant a bad
// connection string produced a server that never accepted a single request.
const server = app.listen(PORT, () => {
  console.log(`Wander Armenia API listening on http://localhost:${PORT}`);
});

connectToDatabase()
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => {
    console.error("Could not connect to MongoDB:", err.message);
    process.exit(1);
  });

const shutdown = (signal) => {
  console.log(`${signal} received, shutting down.`);
  server.close(async () => {
    await mongoose.connection.close();
    process.exit(0);
  });
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
