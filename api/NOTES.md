# Design notes — API

Why the code is the way it is. Written as the questions a reviewer is most
likely to ask, with short answers.

---

### Why is every controller wrapped in `asyncHandler`?

Express 4 doesn't understand async functions. If a promise rejects inside a
handler and nothing catches it, the request just hangs. `asyncHandler` is three
lines that attach `.catch(next)`, so any rejection lands in the error middleware
as a 500.

The payoff is that a `try/catch` inside a controller now *means* something: it's
there because I want to return a specific status — a 403, a 404, a 422 — not
just to convert an error into a 500.

### Why store coordinates as GeoJSON rather than a `{ lat, lng }` pair?

Because "what can I see from where I am standing" is the app's central question,
and a `2dsphere` index answers it in the database. Two plain numbers would mean
loading every document and measuring distance in JavaScript, which stops being
acceptable the moment the catalogue grows.

The cost is that GeoJSON stores `[longitude, latitude]` — the reverse of how
people write coordinates. That reversal is contained entirely in
`models/place.js`: a `toObject` transform hands every caller a plain
`{ lat, lng }`, and `Place.toGeoPoint({ lat, lng })` converts back. Nothing
outside that file has to remember the order.

### Why does the nearby query use an aggregation instead of `find()`?

`$geoNear` both sorts by distance *and* reports it, which a `find()` cannot do —
and the distance is worth showing, since "3 km away" is the whole point of the
feature. It has to be the first stage of the pipeline, so pagination, the
creator lookup and the total count all happen after it inside a `$facet`.

The tradeoff is that aggregation output bypasses the schema's `toObject`
transform, so `shapeAggregated` in the controller redoes that reshaping by hand.
Worth it for one endpoint; it would be worth extracting if there were three.

A malformed `?near=` returns `null` from `parseNearby` rather than a 422 — a
flaky geolocation API should degrade to the normal listing, not break the page.

### Why use a transaction to create a place?

Creating one writes to two places: the `places` collection, and the `places`
array on the user document. If the process died between those two writes, I'd
have a place nobody owns, or a user pointing at a place that doesn't exist. A
transaction makes both land or neither.

Deleting is the same argument with one more write: the place, the owner's
reference, and a pull from the `visited` and `wishlist` arrays of everyone who
saved it. A deleted place must not linger on anyone's list.

**Follow-up you should expect:** *"Do transactions work on any MongoDB?"* No —
they need a replica set. Atlas gives you one by default. That's also why the
local demo (`npm run dev:demo`) starts an in-memory **replica set** rather than
a plain in-memory server.

### Why are the visited and wishlist lists arrays on the user, not a join collection?

A person tracks tens of places, not thousands, so an array of ids is the simpler
and faster shape: one document read, one `$addToSet` to write, no second
collection to keep in step. A join collection would earn its keep if a list
entry needed its own data — a date visited, a note, a rating — which is exactly
the change that would make me rewrite this.

Adding to one list pulls from the other in the same update, because somewhere
you have been is no longer somewhere you want to go. `$addToSet` also makes the
call idempotent, so a double tap or a retried request can't create duplicates.

### Why cache the database connection on `global`?

On Vercel each request may hit a fresh function instance. If I called
`mongoose.connect()` per request, I'd open a new connection every time and blow
through Atlas's connection limit. Instances get reused when they're warm, and
anything on `global` survives that reuse — so I connect roughly once per
instance instead of once per request. See `util/db.js`.

I also don't cache a *failed* connection promise, or one bad attempt would
poison every later request on that instance.

### Why is `/api/health` declared before the database check?

So it can answer while the database connection is still opening. Its whole job
is to tell the frontend "the server is up" as early as possible. It also kicks
off `connectToDatabase()` without awaiting it, so the probe actually warms the
connection pool instead of just measuring it.

### Why are uploads held in memory instead of written to disk?

Two reasons. First, both Vercel and Render have an ephemeral filesystem —
anything written to disk disappears on the next restart, so disk was never a
real option in production. Second, holding the file in memory means **I decide
when to store it**. The controller validates the request, geocodes the address,
and only then calls `saveImage()`. A rejected request never uploads anything, so
there are no orphaned files to clean up.

The 4 MB limit is what makes buffering safe — that's a few megabytes of RAM for
the life of one request.

### Why 4 MB specifically?

Vercel caps a serverless function's request body at 4.5 MB. Anything bigger
would be rejected by the platform before my code ever ran, so the app's own
limit sits just under it and can return a proper error message.

### Why does `HttpError` use `status` and not `code`?

Because MongoDB puts *its* error codes on `err.code` — a duplicate key is
`11000`. The global error handler reads the status off the error, and if it
trusted `.code`, an unhandled duplicate-key error would call `res.status(11000)`
and throw a `RangeError`. Using a differently-named field makes the collision
impossible.

### Why escape the search term before putting it in a regex?

`escapeRegex` in `util/query.js`. Without it, searching for `a(` builds an
invalid regular expression and the endpoint 500s. Regex metacharacters from user
input are also a denial-of-service risk (a catastrophically backtracking
pattern), so neutralising them is the right default.

### Why is `category` a fixed enum but `tags` free text?

The filter chips are only useful if the vocabulary is small and stable. Ten
categories — monastery, church, fortress, archaeological, museum, mountain,
lake, waterfall, cave, other — give a reader a mental map of the catalogue;
a hundred user-invented ones would not. Tags carry everything the enum can't
("unesco", "13th-century", "tavush") and are normalised to lowercase slugs in
`util/tags.js`, so filtering by them is still predictable.

### Where does the catalogue data come from?

Wikidata, via its public SPARQL endpoint. `scripts/wikidata.js` asks for items
located in Armenia that are an instance of one of the mapped classes —
monastery, church, fortress, archaeological site, museum, mountain, lake,
waterfall, cave — **and** have both coordinates and a photo on Wikimedia
Commons, then maps each result onto the `Place` schema, composing a readable
description out of the structured fields.

Three things I'd point at if asked:

- **One query per category, not one big query.** Asking for all nine types at
  once reliably times out on the shared endpoint, and querying separately also
  produces a balanced spread across categories instead of whichever type sorts
  first. Each type retries with backoff and is skipped if it keeps failing — a
  partial catalogue beats none.
- **Rows are folded, not deduplicated.** A place comes back once per
  (administrative area × heritage status) combination, so Geghard appears three
  times. Each row can carry a different useful fact — one names the province,
  another says it's a UNESCO site — so the rows are merged rather than having
  the extras thrown away.
- **The result is committed to the repo** as `scripts/places.json` (461 places),
  and `npm run seed` reads that file rather than calling Wikidata. Seeding is
  therefore deterministic, offline-capable and fast, and the dataset is
  reviewable in a diff. `npm run fetch:places` refreshes it when I actually want
  new content.

Licensing: Wikidata is CC0 1.0, Commons images are freely licensed, and both are
credited in the app's footer. Each place also stores `sourceName` and `sourceUrl`
so the UI can link back to the original record.

### What happens if the geocoding service is down or rate-limits you?

`util/location.js` calls Nominatim, OpenStreetMap's free geocoder. It's free, needs
no API key, and asks for two things in return: an identifying `User-Agent`
(required — requests without one are refused) and roughly one request per second.
Exceed that and it returns `403`.

The app handles it as a `503` with a readable message rather than a crash, and
caches recent lookups in memory so browsing the same addresses doesn't re-query.
For anything with real traffic I'd move to a keyed provider (LocationIQ, Geoapify,
Mapbox) — the tradeoff is an API key and a quota instead of a shared rate limit.

### Why does login return the same error for a wrong email and a wrong password?

If "no such user" and "wrong password" gave different responses, anyone could use
the endpoint to find out which email addresses have accounts. Same message, same
401, either way.

### Why rate limiting?

It's a public demo, so the realistic abuse is someone brute-forcing the login or
hammering the upload endpoint (which costs a geocoding call and a Cloudinary
upload). Three tiers in `middleware/rate-limit.js`: general, stricter on auth,
strictest on uploads.

**Honest caveat worth volunteering:** the limiter stores counts in memory, and
serverless instances don't share memory. It's a speed bump, not a wall. A real
deployment would back it with Redis.

### Why bcrypt with 12 rounds?

bcrypt is deliberately slow, which is what makes a stolen hash expensive to
crack. 12 rounds is the common default — high enough to be costly to attack, low
enough that a login doesn't feel slow.

### Where is the JWT stored, and is that safe?

The client keeps it in `localStorage`. That's the honest tradeoff to explain:
it's simple and works across tabs, but it's readable by JavaScript, so an XSS
bug would expose it. The more secure option is an httpOnly cookie, which the
browser attaches automatically and JS can't read — at the cost of needing CSRF
protection and more CORS setup. For a portfolio demo I chose the simpler one; in
production handling real accounts I'd use the cookie.

### Does the text search use an index?

No, and that's deliberate. It's a case-insensitive regex across title, region,
description and tags, and a regex that isn't anchored to the start of a string
can't use an index — so it scans the collection. At this size that's irrelevant.
The next step would be a MongoDB text index, which is fast but only matches whole
words, so I'd be trading substring search for speed.

The indexes that *do* matter are declared in `models/place.js`: `2dsphere` on
`location` for the nearby query, `createdAt` for the default sort,
`{ creator, createdAt }` for a contributor's page, and single-field indexes on
`category` and `tags` for the filters.

### What does the `/facets` aggregation do?

It produces the counts on the filter chips — tags, categories and regions.
`$unwind` turns one place with three tags into three rows, `$group` counts them
per tag, `$sort` puts the popular ones first. The point is that the UI never
offers a filter that would return zero results.

The total comes from summing the category counts rather than a separate
`countDocuments`: every place has exactly one category, so those counts already
add up to the collection size.

It's also the one endpoint with a `Cache-Control` header — the counts only
change when someone adds or deletes a place, so a short shared cache saves a
function invocation on most page loads.
