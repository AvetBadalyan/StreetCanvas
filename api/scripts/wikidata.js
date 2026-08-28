/**
 * Fetches public artworks from Wikidata.
 *
 * Wikidata is a structured, openly licensed database. Its public SPARQL
 * endpoint lets us ask for exactly the shape this app needs - a titled
 * artwork with an artist, a date, coordinates and a photo on Wikimedia
 * Commons - which is why the seed data is real rather than invented.
 */

const ENDPOINT = "https://query.wikidata.org/sparql";

// The endpoint requires an identifying User-Agent and will refuse anonymous
// traffic. Same policy as Nominatim.
const USER_AGENT =
  process.env.WIKIDATA_USER_AGENT ||
  "StreetCanvas/1.0 (https://github.com/AvetBadalyan/StreetCanvas)";

// Wikidata classes mapped onto this app's art-form vocabulary. Queried as an
// explicit list rather than walking the `subclass of` tree, which times out on
// the public endpoint.
const TYPES = {
  Q860861: "sculpture", // sculpture
  Q179700: "statue", // statue
  Q4989906: "monument", // monument
  Q5003624: "memorial", // memorial
  Q219423: "mural", // mural
  Q483453: "fountain", // fountain
  Q20437094: "installation", // public art installation
};

// One type per query. Asking for all of them at once reliably times out on the
// public endpoint, and querying separately also gives a balanced spread across
// art forms rather than whichever type happens to sort first.
const buildQuery = (qid, limit) => `
SELECT ?item ?itemLabel ?itemDescription ?creatorLabel ?inception
       ?image ?coord ?placeLabel ?countryLabel ?materialLabel
WHERE {
  ?item wdt:P31 wd:${qid} ;
        wdt:P18 ?image ;
        wdt:P625 ?coord .
  OPTIONAL { ?item wdt:P170 ?creator . }
  OPTIONAL { ?item wdt:P571 ?inception . }
  OPTIONAL { ?item wdt:P131 ?place . }
  OPTIONAL { ?item wdt:P17  ?country . }
  OPTIONAL { ?item wdt:P186 ?material . }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}
LIMIT ${limit}
`;

/** Commons file URLs are full-size originals; ask for a web-sized rendering. */
const sizedImage = (url, width = 1200) =>
  `${url.replace("http://", "https://")}?width=${width}`;

/** "Point(2.331944 48.861944)" -> { lat, lng } */
const parsePoint = (wkt) => {
  const match = /Point\(([-\d.]+) ([-\d.]+)\)/.exec(wkt || "");
  if (!match) return null;
  const [, lng, lat] = match;
  return { lat: parseFloat(lat), lng: parseFloat(lng) };
};

/**
 * The label service falls back to the raw entity id ("Q124056880") when an item
 * has no English label. Those are useless to a reader, so treat them as absent.
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

/**
 * Turns one SPARQL row into the shape the Artwork model expects.
 * Returns null for rows too incomplete to be worth showing.
 */
const toArtwork = (row, form) => {
  const title = cleanLabel(row.itemLabel?.value);
  const location = parsePoint(row.coord?.value);
  const image = row.image?.value;

  if (!title || !location || !image) return null;

  const artist = cleanLabel(row.creatorLabel?.value) || "Unknown";
  const year = row.inception?.value?.slice(0, 4);
  const place = cleanLabel(row.placeLabel?.value);
  const country = cleanLabel(row.countryLabel?.value);
  const material = cleanLabel(row.materialLabel?.value);

  const address = [place, country].filter(Boolean).join(", ") || "Unknown location";

  // Wikidata descriptions are terse ("statue in Paris"), so compose a sentence
  // from the structured fields and append the description if it adds anything.
  const sentences = [
    `${title} is a ${form}${artist !== "Unknown" ? ` by ${artist}` : ""}${
      year ? `, dating from ${year}` : ""
    }.`,
  ];
  if (place) sentences.push(`It stands in ${address}.`);
  if (material) sentences.push(`Made of ${material}.`);
  const wikidataDescription = cleanLabel(row.itemDescription?.value);
  if (wikidataDescription) {
    sentences.push(
      wikidataDescription.charAt(0).toUpperCase() + wikidataDescription.slice(1) + "."
    );
  }

  const tags = [
    material && toSlug(material),
    year && Number(year) < 1900 && "historic",
    year && Number(year) >= 2000 && "contemporary",
    country && toSlug(country),
  ].filter((tag) => tag && tag.length >= 2 && tag.length <= 24);

  return {
    title: title.slice(0, 80),
    description: sentences.join(" ").slice(0, 2000),
    artist: artist.slice(0, 80),
    form,
    tags: [...new Set(tags)].slice(0, 8),
    address: address.slice(0, 200),
    location,
    image: sizedImage(image),
    sourceName: "Wikidata",
    sourceUrl: row.item?.value || null,
  };
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Runs one type's query, retrying the endpoint's frequent transient failures. */
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
 * Fetches artworks of every configured type.
 *
 * The public endpoint rate-limits and times out unpredictably, so a failed type
 * is skipped rather than aborting the run - a partial dataset is far more
 * useful than none.
 *
 * @returns {Promise<Array>} artwork-shaped objects, deduplicated by title
 */
const fetchPublicArt = async ({ perType = 25, log = () => {} } = {}) => {
  const collected = [];

  for (const [qid, form] of Object.entries(TYPES)) {
    log(`  querying ${form}…`);
    const rows = await queryType(qid, perType, { log });
    const mapped = rows.map((row) => toArtwork(row, form)).filter(Boolean);
    log(`    ${mapped.length} usable of ${rows.length} rows`);
    collected.push(...mapped);
    // Be a good citizen on a shared public endpoint.
    await sleep(1500);
  }

  const seen = new Set();
  return collected.filter((artwork) => {
    // The same artwork returns once per material/location combination.
    const key = artwork.title.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

module.exports = { fetchPublicArt, TYPES };
