# Wander Armenia — API

REST API for **Wander Armenia**, an atlas of places worth the drive across
Armenia. Serves a catalogue imported from Wikidata, answers "what is near me",
keeps each visitor's visited and wishlist places, and lets contributors
photograph and pin places of their own by street address.

- **Part of the [Wander Armenia](../README.md) monorepo** — the React app lives in [`web/`](../web)
- **Live:** https://wanderarmenia-api.vercel.app
- **Stack:** Node · Express · MongoDB (Mongoose) · JWT · Cloudinary · Nominatim
- **[Design notes](NOTES.md)** — why the non-obvious parts are the way they are

---

## What's interesting in here

Beyond CRUD, a few decisions are worth pointing at:

| Area | Decision |
| --- | --- |
| **Geospatial queries** | Coordinates are stored as **GeoJSON with a `2dsphere` index**, so `?near=lat,lng&radius=km` is answered by a `$geoNear` stage that sorts by distance and reports it — rather than loading the collection and measuring in JavaScript. The API still hands clients a plain `{ lat, lng }`. |
| **Write consistency** | Creating and deleting a place touches several documents (the place, its owner's reference list, and every saved list it appears on). Each runs inside a **MongoDB transaction** with proper `abortTransaction` and `endSession` handling, so a mid-write failure can't leave a dangling reference. |
| **Serverless-ready** | Deployed as a single Vercel function. The Mongoose connection is **cached on `global`** so warm invocations reuse it instead of opening a new Atlas connection per request. |
| **Cold-start UX** | `/api/health` is declared *before* the database guard and the server binds its port *before* connecting to Mongo — so a liveness probe answers immediately and the frontend can distinguish "still booting" from "broken". |
| **Image durability** | Uploads are held in memory by multer and only sent to Cloudinary once the request has passed validation and geocoding, so a rejected request never leaves an orphaned file. Falls back to local disk when no Cloudinary keys are set. |
| **Open data import** | The catalogue is imported from Wikidata's SPARQL endpoint, one category per query with retry and backoff, and cached in the repo so seeding is deterministic and offline. |
| **Idempotent lists** | Saving a place to `visited` or `wishlist` uses `$addToSet` and pulls it from the other list in the same update, so a double tap or a retried request can't produce duplicates or contradictions. |
| **Search** | Regex search across title/region/description/tags, with user input escaped so `a(` can't blow up as an invalid regex. Tag, category and region facets are computed with aggregation pipelines to drive the filter chips. |

Categories are a closed vocabulary — `monastery`, `church`, `fortress`,
`archaeological`, `museum`, `mountain`, `lake`, `waterfall`, `cave`, `other` —
so the filters stay meaningful. Free-text tags cover everything else.

---

## Endpoints

### Public

| Method | Path | Notes |
| --- | --- | --- |
| `GET` | `/` | Short JSON index of the API. Opening the root in a browser is a reasonable thing to do. |
| `GET` | `/api/health` | Liveness probe. Answers before the DB connects. |
| `GET` | `/api/places` | Catalogue. Query: `q`, `tag`, `category`, `sort` (`recent`\|`oldest`\|`title`), `page`, `limit` (default 12, max 48). Returns `{ places, pagination }`. |
| `GET` | `/api/places?near=lat,lng&radius=km` | Same filters, but nearest first with a `distanceKm` on each result. Radius defaults to 25 km, capped at 200. A malformed `near` degrades to the normal listing rather than erroring. |
| `GET` | `/api/places/facets` | Tag, category and region counts for the filter UI, plus the collection total. |
| `GET` | `/api/places/:pid` | Single place. |
| `GET` | `/api/places/user/:uid` | A contributor and their places. **Returns an empty `places` array** for a contributor with none — an empty profile is a normal state, not a 404. An unknown contributor id is still a 404. |
| `GET` | `/api/users` | All contributors (never includes password hashes). |
| `POST` | `/api/users/signup` | `multipart/form-data`: `name`, `email`, `password`, `image`. |
| `POST` | `/api/users/login` | JSON: `email`, `password`. |

### Authenticated (`Authorization: Bearer <token>`)

| Method | Path | Notes |
| --- | --- | --- |
| `POST` | `/api/places` | `multipart/form-data`: `title`, `description`, `address`, `image`, optional `region`, `category`, `tags` (comma-separated). Geocodes the address, then writes in a transaction. |
| `PATCH` | `/api/places/:pid` | JSON. Owner only. Photo and location are immutable by design. |
| `DELETE` | `/api/places/:pid` | Owner only. Removes the Cloudinary asset after the transaction commits. |
| `GET` | `/api/me/lists` | Your `visited` and `wishlist` places, fully populated so the UI needs no second round trip. |
| `PUT` | `/api/me/lists/:list/:pid` | `list` is `visited` or `wishlist`. Adding to one removes it from the other. |
| `DELETE` | `/api/me/lists/:list/:pid` | Removes a place from that list. |

Every error returns the same shape: `{ "message": "..." }`.

---

## Local setup

**Just want to see it run?** No database or credentials needed:

```bash
npm install
npm run dev:demo
```

That boots a throwaway in-memory MongoDB replica set, seeds it, and serves the
API on `http://localhost:5000`. Everything is discarded on exit. (A replica set
rather than a plain in-memory server, because create and delete run in a
transaction.)

**Working against a real database:**

```bash
cp .env.example .env      # then fill it in
npm run seed              # optional: load the bundled catalogue
npm run dev
```

### Environment

See [`.env.example`](.env.example). `MONGO_URI` and `JWT_KEY` are required; the
process exits with a clear message if either is missing.

Cloudinary keys are optional locally — without them, uploads go to
`uploads/images/` on disk. **They are required in production**, because both
Vercel and Render have ephemeral filesystems: disk uploads are deleted on every
restart and redeploy.

> **Never commit secrets.** This repo previously shipped a `nodemon.json`
> containing live database credentials. It is now gitignored, and configuration
> comes from `.env` only.

### Seeding

```bash
npm run seed              # add demo content, skip anything already present
npm run seed -- --reset   # wipe users + places first
```

Demo login: `demo@wanderarmenia.demo` / `demo1234`. That one account owns every
imported record: inventing several "contributors" for data that came from
Wikidata would misattribute it.

The catalogue lives in `scripts/places.json` — 461 places, CC0 1.0 from
Wikidata, images via Wikimedia Commons. Refresh it with `npm run fetch:places`
(optionally setting `WIKIDATA_USER_AGENT`), only when you want different
content.

---

## Deploying to Vercel

The app exports an Express instance (`app.js`) with no `listen()` call;
[`api/index.js`](api/index.js) re-exports it as a serverless function and
[`vercel.json`](vercel.json) rewrites every path to it.

```bash
npm i -g vercel
vercel            # first deploy, links the project
vercel --prod
```

Then set these in **Project → Settings → Environment Variables**:

```
MONGO_URI, JWT_KEY,
CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET,
CORS_ORIGIN            # e.g. https://wanderarmenia.vercel.app
GEOCODER_USER_AGENT    # e.g. WanderArmenia/1.0 (you@example.com)
```

**Note:** Vercel caps a function's request body at 4.5 MB, which is why uploads
are limited to 4 MB.

Running as a long-lived process instead (Render, Railway, a container) works too
— `npm start` runs [`server.js`](server.js), which binds a port and connects.

---

## Project layout

```
api/index.js          serverless entry point (exports the express app)
app.js                express app: middleware, routes, error handling
server.js             long-lived process entry point (binds a port)
controllers/          request handlers, wrapped in asyncHandler
routes/               route definitions + express-validator rules
models/               mongoose schemas
middleware/           auth, uploads, rate limiting, request/id validation
util/                 db cache, geocoding, image store, query parsing, helpers
scripts/seed.js       catalogue loader (also used by dev:demo)
scripts/places.json   the bundled catalogue, committed so seeding is offline
scripts/wikidata.js   SPARQL client + mapping onto the Place schema
scripts/fetch-places  rewrites places.json from Wikidata
scripts/dev-server    zero-setup local demo on an in-memory database
```

A few conventions worth knowing if you read the source:

- **Handlers are wrapped in `asyncHandler`**, so a rejected promise reaches the
  error middleware. A `try/catch` inside a controller therefore means "I have
  something specific to say about this failure" — a 403, a 404, a 422 — and
  never just "turn this into a 500".
- **`validateRequest`** runs after each validation chain, so no controller
  repeats the `validationResult` preamble.
- **`HttpError` carries `status`, not `code`.** Mongo puts its own numeric codes
  on `err.code`, and reading a status off that would hand `res.status()` an
  11000.

## Security

- Passwords hashed with bcrypt (12 rounds); hashes are stripped from every response.
- JWT bearer auth, 7-day expiry, verified per request.
- `helmet` security headers, CORS restricted to an allowlist via `CORS_ORIGIN`.
- Rate limiting: 300 req/15 min overall, 20/15 min on auth endpoints, 30/hr on uploads.
- Uploads restricted by MIME type (PNG, JPEG, WEBP) and capped at 4 MB.
- Login returns an identical response whether the email or the password was
  wrong, so the endpoint can't be used to enumerate registered accounts.
