/**
 * Fetches places worth visiting in Armenia from Wikidata.
 *
 * Wikidata is a structured, openly licensed database. Its public SPARQL
 * endpoint lets us ask for exactly the shape this app needs - a named place
 * with a category, coordinates and a photo on Wikimedia Commons - which is why
 * the catalogue is real rather than invented.
 */

const ENDPOINT = "https://query.wikidata.org/sparql";
const ARMENIA = "Q399";

// The endpoint requires an identifying User-Agent and refuses anonymous
// traffic. Same policy as Nominatim.
const USER_AGENT =
  process.env.WIKIDATA_USER_AGENT ||
  "WanderArmenia/1.0 (https://github.com/AvetBadalyan/wander-armenia)";

// Wikidata classes mapped onto this app's categories. Queried as an explicit
// list rather than walking the `subclass of` tree, which times out on the
// public endpoint.
const TYPES = {
  Q44613: "monastery",
  Q16970: "church",
  Q23413: "fortress",
  Q839954: "archaeological",
  Q33506: "museum",
  Q8502: "mountain",
  Q23397: "lake",
  Q34038: "waterfall",
  Q35509: "cave",
};

// One type per query: a combined query reliably times out, and querying
// separately also gives a balanced spread across categories.
const buildQuery = (qid, limit) => `
SELECT ?item ?itemLabel ?itemDescription ?inception ?image ?coord
       ?adminLabel ?heritageLabel
WHERE {
  ?item wdt:P17 wd:${ARMENIA} ;
        wdt:P31 wd:${qid} ;
        wdt:P18 ?image ;
        wdt:P625 ?coord .
  OPTIONAL { ?item wdt:P571 ?inception . }
  OPTIONAL { ?item wdt:P131 ?admin . }
  OPTIONAL { ?item wdt:P1435 ?heritage . }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en,hy". }
}
LIMIT ${limit}
`;

/** Commons file URLs are full-size originals; ask for a web-sized rendering. */
const sizedImage = (url, width = 1200) =>
  `${url.replace("http://", "https://")}?width=${width}`;

/** "Point(44.8 40.1)" -> { lat, lng } */
const parsePoint = (wkt) => {
  const match = /Point\(([-\d.]+) ([-\d.]+)\)/.exec(wkt || "");
  if (!match) return null;
  const [, lng, lat] = match;
  return { lat: parseFloat(lat), lng: parseFloat(lng) };
};

/**
 * The label service falls back to the raw entity id ("Q124056880") when an item
 * has no label in our requested languages. Those are useless to a reader.
 */
const cleanLabel = (value) => {
  const trimmed = value?.trim();
  if (!trimmed || /^Q\d+$/.test(trimmed)) return undefined;
  return trimmed;
};

const toSlug = (value) =>
  value
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "");

/** 1215 -> "13th century" */
const centuryOf = (year) => {
  const n = Math.ceil(year / 100);
  const suffix = n % 10 === 1 && n !== 11 ? "st" : n % 10 === 2 && n !== 12 ? "nd" : n % 10 === 3 && n !== 13 ? "rd" : "th";
  return `${n}${suffix} century`;
};

/**
 * Merges the several rows Wikidata returns per place into one record.
 *
 * A place appears once per (admin area x heritage status) combination, so
 * Geghard comes back three times. Rather than discarding the duplicates we
 * fold them together, because each row can carry a different useful fact -
 * one names the province, another says it is a UNESCO site.
 */
const foldRows = (rows) => {
  const byItem = new Map();

  for (const row of rows) {
    const id = row.item?.value;
    const title = cleanLabel(row.itemLabel?.value);
    const location = parsePoint(row.coord?.value);
    const image = row.image?.value;
    if (!id || !title || !location || !image) continue;

    if (!byItem.has(id)) {
      byItem.set(id, {
        id,
        title,
        location,
        image,
        description: cleanLabel(row.itemDescription?.value),
        year: row.inception?.value?.slice(0, 4),
        admins: new Set(),
        heritages: new Set(),
      });
    }

    const place = byItem.get(id);
    const admin = cleanLabel(row.adminLabel?.value);
    const heritage = cleanLabel(row.heritageLabel?.value);
    if (admin) place.admins.add(admin);
    if (heritage) place.heritages.add(heritage);
  }

  return [...byItem.values()];
};

/** Prefer the province over the village: it is what a visitor navigates by. */
const pickRegion = (admins) => {
  const list = [...admins];
  return list.find((a) => /province/i.test(a)) || list[0];
};

/**
 * A handful of Wikidata labels are entered in capitals ("ARAQELOTS MONASTERY OF
 * PEMZASHEN"). Left alone they shout from the page, so titles that are entirely
 * uppercase get title-cased. Mixed-case labels are never touched, since those
 * capitals are deliberate.
 */
const softenShouting = (title) => {
  if (title !== title.toUpperCase()) return title;
  const minor = new Set(["of", "the", "and", "in", "at", "on"]);
  return title
    .toLowerCase()
    .split(" ")
    .map((word, index) =>
      index > 0 && minor.has(word) ? word : word.charAt(0).toUpperCase() + word.slice(1)
    )
    .join(" ");
};

const toPlace = (folded, category) => {
  const { location, image, description, year, admins, heritages } = folded;
  const title = softenShouting(folded.title);

  const region = pickRegion(admins);
  const isUnesco = [...heritages].some((h) => /unesco/i.test(h));

  const sentences = [];
  const built = year && Number(year) > 0 ? Number(year) : null;
  sentences.push(
    `${title} is a ${category}${region ? ` in ${region}` : " in Armenia"}${
      built ? `, dating from ${built}` : ""
    }.`
  );
  if (isUnesco) sentences.push("It is part of a UNESCO World Heritage Site.");
  // Wikidata's own description is often just "cultural heritage monument of
  // Armenia", which repeats what the category already says.
  if (description && !/^cultural heritage monument/i.test(description)) {
    sentences.push(description.charAt(0).toUpperCase() + description.slice(1) + ".");
  }

  const tags = [
    isUnesco && "unesco",
    built && centuryOf(built) && toSlug(centuryOf(built)),
    heritages.size > 0 && "heritage-monument",
    region && toSlug(region.replace(/\s*province$/i, "")),
  ].filter((tag) => tag && tag.length >= 2 && tag.length <= 24);

  return {
    title: title.slice(0, 80),
    description: sentences.join(" ").slice(0, 2000),
    category,
    region: region ? region.slice(0, 80) : "Armenia",
    year: built,
    tags: [...new Set(tags)].slice(0, 8),
    location,
    image: sizedImage(image),
    sourceName: "Wikidata",
    sourceUrl: folded.id,
  };
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Runs one category's query, retrying the endpoint's frequent transient failures. */
const queryType = async (qid, limit, { attempts = 3, log } = {}) => {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(
        `${ENDPOINT}?query=${encodeURIComponent(buildQuery(qid, limit))}`,
        {
          headers: {
            Accept: "application/sparql-results+json",
            "User-Agent": USER_AGENT,
          },
          signal: AbortSignal.timeout(45000),
        }
      );
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = await response.json();
      return payload.results.bindings;
    } catch (err) {
      const last = attempt === attempts;
      log?.(
        `    ${TYPES[qid]}: attempt ${attempt}/${attempts} failed (${err.message})${
          last ? " - skipping" : ", retrying"
        }`
      );
      if (last) return [];
      await sleep(3000 * attempt);
    }
  }
  return [];
};

/**
 * Fetches places of every configured category.
 *
 * The public endpoint rate-limits and times out unpredictably, so a failed
 * category is skipped rather than aborting the run - a partial catalogue is far
 * more useful than none.
 */
const fetchPlaces = async ({ perType = 200, log = () => {} } = {}) => {
  const collected = [];

  for (const [qid, category] of Object.entries(TYPES)) {
    log(`  querying ${category}…`);
    // Each place yields several rows, so ask for well above the target count.
    const rows = await queryType(qid, perType * 3, { log });
    const places = foldRows(rows)
      .slice(0, perType)
      .map((folded) => toPlace(folded, category));
    log(`    ${places.length} places from ${rows.length} rows`);
    collected.push(...places);
    // Be a good citizen on a shared public endpoint.
    await sleep(1500);
  }

  const seen = new Set();
  return collected.filter((place) => {
    const key = place.title.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

module.exports = { fetchPlaces };
