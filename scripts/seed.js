/**
 * Populates the database with demo contributors and artworks.
 *
 *   npm run seed            add demo content, skipping anything already present
 *   npm run seed -- --reset delete all users and artworks first
 *
 * A deployed portfolio project that greets visitors with an empty grid reads as
 * broken, so this exists to make a fresh database presentable in one command.
 *
 * Exported as a function too, so `npm run dev:demo` can seed its throwaway
 * in-memory database without shelling out to a second process.
 */

require("dotenv").config();

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const User = require("../models/user");
const Artwork = require("../models/artwork");
const { users, artworks } = require("./seed-data");

const DEMO_PASSWORD = "demo1234";

const seedDatabase = async ({ reset = false, log = console.log } = {}) => {
  if (reset) {
    const [removedArtworks, removedUsers] = await Promise.all([
      Artwork.deleteMany({}),
      User.deleteMany({}),
    ]);
    log(
      `Reset: removed ${removedUsers.deletedCount} users and ${removedArtworks.deletedCount} artworks`
    );
  }

  // One hash for all demo accounts - they share a password and hashing is the
  // slowest part of this script.
  const hashedPassword = await bcrypt.hash(DEMO_PASSWORD, 12);

  const usersByKey = new Map();

  for (const seedUser of users) {
    let user = await User.findOne({ email: seedUser.email });

    if (!user) {
      user = await User.create({
        name: seedUser.name,
        email: seedUser.email,
        password: hashedPassword,
        image: seedUser.image,
        artworks: [],
      });
      log(`+ created user ${seedUser.email}`);
    }

    usersByKey.set(seedUser.key, user);
  }

  let created = 0;
  let skipped = 0;

  for (const seedArtwork of artworks) {
    const owner = usersByKey.get(seedArtwork.owner);
    if (!owner) {
      log(`! no seed user "${seedArtwork.owner}", skipping artwork`);
      continue;
    }

    const exists = await Artwork.findOne({
      title: seedArtwork.title,
      creator: owner._id,
    });

    if (exists) {
      skipped += 1;
      continue;
    }

    const artwork = await Artwork.create({
      title: seedArtwork.title,
      description: seedArtwork.description,
      artist: seedArtwork.artist,
      form: seedArtwork.form,
      tags: seedArtwork.tags,
      address: seedArtwork.address,
      location: seedArtwork.location,
      image: seedArtwork.image,
      creator: owner._id,
    });

    owner.artworks.push(artwork._id);
    await owner.save();
    created += 1;
  }

  return { created, skipped, demoEmail: users[0].email, demoPassword: DEMO_PASSWORD };
};

const runCli = async () => {
  if (!process.env.MONGO_URI) {
    console.error("MONGO_URI is not set. Copy .env.example to .env first.");
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  const result = await seedDatabase({
    reset: process.argv.includes("--reset"),
  });

  console.log(
    `Done. ${result.created} artworks created, ${result.skipped} already present.\n` +
      `Demo login: ${result.demoEmail} / ${result.demoPassword}`
  );

  await mongoose.connection.close();
};

module.exports = { seedDatabase, DEMO_PASSWORD };

// Only run when invoked directly, not when required by the dev server.
if (require.main === module) {
  runCli().catch(async (err) => {
    console.error("Seeding failed:", err);
    await mongoose.connection.close();
    process.exit(1);
  });
}
