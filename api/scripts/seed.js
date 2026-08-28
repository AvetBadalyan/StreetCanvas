/**
 * Populates the database with the bundled public-art dataset.
 *
 *   npm run seed            add anything not already present
 *   npm run seed -- --reset delete all users and artworks first
 *
 * The content comes from scripts/public-art.json, fetched from Wikidata by
 * `npm run fetch:art`. Seeding itself does no network calls, so it is fast,
 * deterministic and works offline.
 *
 * A deployed portfolio project that greets visitors with an empty grid reads as
 * broken, so this exists to make a fresh database presentable in one command.
 */

require("dotenv").config();

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const User = require("../models/user");
const Artwork = require("../models/artwork");

const DEMO_PASSWORD = "demo1234";

// One account owns the imported records. Inventing several "contributors" for
// data that came from Wikidata would misattribute it; this way the catalogue is
// honestly credited and the demo login can still edit and delete.
const DEMO_USER = {
  name: "Open Data",
  email: "demo@streetcanvas.demo",
  image:
    "https://commons.wikimedia.org/wiki/Special:FilePath/Wikidata-logo-en.svg?width=300",
};

const loadDataset = () => {
  try {
    return require("./public-art.json");
  } catch {
    throw new Error(
      "scripts/public-art.json is missing. Run `npm run fetch:art` to download the dataset first."
    );
  }
};

const seedDatabase = async ({ reset = false, log = console.log } = {}) => {
  const { artworks: dataset } = loadDataset();

  if (reset) {
    const [removedArtworks, removedUsers] = await Promise.all([
      Artwork.deleteMany({}),
      User.deleteMany({}),
    ]);
    log(
      `Reset: removed ${removedUsers.deletedCount} users and ${removedArtworks.deletedCount} artworks`
    );
  }

  let owner = await User.findOne({ email: DEMO_USER.email });
  if (!owner) {
    owner = await User.create({
      ...DEMO_USER,
      password: await bcrypt.hash(DEMO_PASSWORD, 12),
      artworks: [],
    });
    log(`+ created contributor ${DEMO_USER.email}`);
  }

  let created = 0;
  let skipped = 0;

  for (const entry of dataset) {
    const exists = await Artwork.findOne({ title: entry.title, creator: owner._id });
    if (exists) {
      skipped += 1;
      continue;
    }

    const artwork = await Artwork.create({ ...entry, creator: owner._id });
    owner.artworks.push(artwork._id);
    created += 1;
  }

  await owner.save();

  return { created, skipped, demoEmail: DEMO_USER.email, demoPassword: DEMO_PASSWORD };
};

const runCli = async () => {
  if (!process.env.MONGO_URI) {
    console.error("MONGO_URI is not set. Copy .env.example to .env first.");
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  const result = await seedDatabase({ reset: process.argv.includes("--reset") });

  console.log(
    `Done. ${result.created} artworks created, ${result.skipped} already present.\n` +
      `Demo login: ${result.demoEmail} / ${result.demoPassword}`
  );

  await mongoose.connection.close();
};

module.exports = { seedDatabase, DEMO_PASSWORD, DEMO_USER };

// Only run when invoked directly, not when required by the dev server.
if (require.main === module) {
  runCli().catch(async (err) => {
    console.error("Seeding failed:", err.message);
    await mongoose.connection.close();
    process.exit(1);
  });
}
