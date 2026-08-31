/**
 * Zero-setup local demo:  npm run dev:demo
 *
 * Boots a throwaway in-memory MongoDB replica set, seeds it, and starts the API
 * against it. No Atlas account, no local mongod, no .env required - so the repo
 * can be cloned and run by anyone in one command.
 *
 * A replica set (rather than a plain in-memory server) is required because
 * creating and deleting a place run inside a transaction.
 *
 * Everything lives in memory and is discarded on exit.
 */

const { MongoMemoryReplSet } = require("mongodb-memory-server");

const PORT = process.env.PORT || 5000;

const start = async () => {
  console.log("Starting in-memory MongoDB (first run downloads it, ~1 min)...");
  const replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });

  // Must be set before app.js is required - it reads config at load time.
  process.env.MONGO_URI = replSet.getUri("wanderarmenia");
  process.env.JWT_KEY =
    process.env.JWT_KEY || "local_dev_only_key_not_a_real_secret";
  // Left unset on purpose: with no allowlist the API accepts any origin, so the
  // dev server works whatever port Vite ends up on.

  const { connectToDatabase } = require("../util/db");
  const { seedDatabase } = require("./seed");
  const app = require("../app");

  await connectToDatabase();

  const result = await seedDatabase({ log: () => {} });
  console.log(`Seeded ${result.created} places.`);

  const server = app.listen(PORT, () => {
    console.log(
      [
        "",
        "  Wander Armenia API (demo mode)",
        `  http://localhost:${PORT}/api/health`,
        "",
        `  Demo login:  ${result.demoEmail}  /  ${result.demoPassword}`,
        "",
        "  In-memory database - all changes are lost on exit.",
        "",
      ].join("\n")
    );
  });

  const shutdown = async () => {
    server.close();
    await replSet.stop();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
};

start().catch((err) => {
  console.error("Could not start the demo server:", err);
  process.exit(1);
});
