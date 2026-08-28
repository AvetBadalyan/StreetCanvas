/**
 * Refreshes the bundled public-art dataset from Wikidata.
 *
 *   npm run fetch:art
 *
 * Writes scripts/public-art.json, which `npm run seed` then loads. Keeping the
 * fetched data in the repository means seeding is deterministic, works offline,
 * and does not depend on a public SPARQL endpoint that rate-limits and times
 * out unpredictably. It also makes the dataset reviewable in a diff.
 *
 * Run this only when you want to refresh the content.
 */

const fs = require("fs/promises");
const path = require("path");

const { fetchPublicArt } = require("./wikidata");

const OUTPUT = path.join(__dirname, "public-art.json");

const run = async () => {
  console.log("Fetching public art from Wikidata…\n");

  const artworks = await fetchPublicArt({ perType: 25, log: console.log });

  if (artworks.length === 0) {
    console.error(
      "\nNo artworks returned. The Wikidata endpoint is likely rate-limiting; wait a minute and try again."
    );
    process.exit(1);
  }

  const byForm = artworks.reduce((counts, artwork) => {
    counts[artwork.form] = (counts[artwork.form] || 0) + 1;
    return counts;
  }, {});

  await fs.writeFile(
    OUTPUT,
    `${JSON.stringify(
      {
        source: "https://query.wikidata.org/",
        license: "CC0 1.0 (Wikidata) - images via Wikimedia Commons",
        fetchedAt: new Date().toISOString(),
        artworks,
      },
      null,
      2
    )}\n`
  );

  console.log(`\nWrote ${artworks.length} artworks to ${path.basename(OUTPUT)}`);
  console.log(
    `By form: ${Object.entries(byForm)
      .map(([form, count]) => `${form} ${count}`)
      .join(", ")}`
  );
};

run().catch((err) => {
  console.error("Fetch failed:", err.message);
  process.exit(1);
});
