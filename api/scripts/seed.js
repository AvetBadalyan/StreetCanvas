/**
 * Populates the database with the bundled catalogue of Armenian places.
 *
 *   npm run seed            add anything not already present
 *   npm run seed -- --reset delete all users and places first
 *
 * The content comes from scripts/places.json, fetched from Wikidata by
 * `npm run fetch:places`. Seeding itself does no network calls, so it is fast,
 * deterministic and works offline.
 *
 * A deployed portfolio project that greets visitors with an empty grid reads as
 * broken, so this exists to make a fresh database presentable in one command.
 */

require("dotenv").config();

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const User = require("../models/user");
const Place = require("../models/place");

const DEMO_PASSWORD = "demo1234";

// One account owns the imported records. Inventing several "contributors" for
// data that came from Wikidata would misattribute it; this way the catalogue is
// honestly credited and the demo login can still edit, delete and save places.
const DEMO_USER = {
  name: "Open Data",
  email: "demo@wanderarmenia.demo",
  image:
    "https://commons.wikimedia.org/wiki/Special:FilePath/Wikidata-logo-en.svg?width=300",
};

const loadDataset = () => {
  try {
    return require("./places.json");
  } catch {
    throw new Error(
      "scripts/places.json is missing. Run `npm run fetch:places` to download the catalogue first."
    );
  }
};

const seedDatabase = async ({ reset = false, log = console.log } = {}) => {
  const { places: dataset } = loadDataset();

  if (reset) {
    const [removedPlaces, removedUsers] = await Promise.all([
      Place.deleteMany({}),
      User.deleteMany({}),
    ]);
    log(
      `Reset: removed ${removedUsers.deletedCount} users and ${removedPlaces.deletedCount} places`
    );
  }

  let owner = await User.findOne({ email: DEMO_USER.email });
  if (!owner) {
    owner = await User.create({
      ...DEMO_USER,
      password: await bcrypt.hash(DEMO_PASSWORD, 12),
      places: [],
    });
    log(`+ created contributor ${DEMO_USER.email}`);
  }

  // Fetch the existing titles once instead of querying per record: seeding 460
  // places would otherwise mean 460 round trips.
  const existing = new Set(
    (await Place.find({ creator: owner._id }).select("title").lean()).map(
      (p) => p.title
    )
  );

  const toInsert = dataset
    .filter((entry) => !existing.has(entry.title))
    .map(({ location, ...entry }) => ({
      ...entry,
      location: Place.toGeoPoint(location),
      creator: owner._id,
    }));

  if (toInsert.length > 0) {
    const created = await Place.insertMany(toInsert);
    owner.places.push(...created.map((place) => place._id));
    await owner.save();
  }

  return {
    created: toInsert.length,
    skipped: dataset.length - toInsert.length,
    demoEmail: DEMO_USER.email,
    demoPassword: DEMO_PASSWORD,
  };
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
    `Done. ${result.created} places created, ${result.skipped} already present.\n` +
      `Demo login: ${result.demoEmail} / ${result.demoPassword}`
  );

  await mongoose.connection.close();
};

module.exports = { seedDatabase };

// Only run when invoked directly, not when required by the dev server.
if (require.main === module) {
  runCli().catch(async (err) => {
    console.error("Seeding failed:", err.message);
    await mongoose.connection.close();
    process.exit(1);
  });
}
