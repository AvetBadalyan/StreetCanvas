/**
 * Refreshes the bundled catalogue of Armenian places from Wikidata.
 *
 *   npm run fetch:places
 *
 * Writes scripts/places.json, which `npm run seed` then loads. Keeping the
 * fetched data in the repository means seeding is deterministic, works offline,
 * and does not depend on a public SPARQL endpoint that rate-limits and times
 * out unpredictably. It also makes the dataset reviewable in a diff.
 *
 * Run this only when you want to refresh the content.
 */

const fs = require("fs/promises");
const path = require("path");

const { fetchPlaces } = require("./wikidata");

const OUTPUT = path.join(__dirname, "places.json");

const run = async () => {
  console.log("Fetching places in Armenia from Wikidata…\n");

  const places = await fetchPlaces({ perType: 200, log: console.log });

  if (places.length === 0) {
    console.error(
      "\nNo places returned. The Wikidata endpoint is likely rate-limiting; wait a minute and try again."
    );
    process.exit(1);
  }

  const byCategory = places.reduce((counts, place) => {
    counts[place.category] = (counts[place.category] || 0) + 1;
    return counts;
  }, {});

  await fs.writeFile(
    OUTPUT,
    `${JSON.stringify(
      {
        source: "https://query.wikidata.org/",
        license: "CC0 1.0 (Wikidata) - images via Wikimedia Commons",
        fetchedAt: new Date().toISOString(),
        places,
      },
      null,
      2
    )}\n`
  );

  console.log(`\nWrote ${places.length} places to ${path.basename(OUTPUT)}`);
  console.log(
    `By category: ${Object.entries(byCategory)
      .map(([form, count]) => `${form} ${count}`)
      .join(", ")}`
  );
};

run().catch((err) => {
  console.error("Fetch failed:", err.message);
  process.exit(1);
});
