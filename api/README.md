# StreetCanvas — API

REST API for **StreetCanvas**, a crowd-mapped atlas of street art. Contributors
photograph a mural, stencil or paste-up, tag it, and pin it to a shared map by
street address.

- **Part of the [StreetCanvas](../README.md) monorepo** — the React app lives in [`web/`](../web)
- **Stack:** Node · Express · MongoDB (Mongoose) · JWT · Cloudinary · Nominatim
- **[Design notes](NOTES.md)** — why the non-obvious parts are the way they are

---

## What's interesting in here

Beyond CRUD, a few decisions are worth pointing at:

| Area | Decision |
| --- | --- |
| **Write consistency** | Creating and deleting an artwork touches two documents (the artwork and its owner's reference list). Both run inside a **MongoDB transaction** with proper `abortTransaction` and `endSession` handling, so a mid-write failure can't leave a dangling reference. |
| **Serverless-ready** | Deployed as a single Vercel function. The Mongoose connection is **cached on `global`** so warm invocations reuse it instead of opening a new Atlas connection per request. |
| **Cold-start UX** | `/api/health` is declared *before* the database guard and the server binds its port *before* connecting to Mongo — so a liveness probe answers immediately and the frontend can distinguish "still booting" from "broken". |
| **Image durability** | Uploads stream straight to Cloudinary through a **custom multer storage engine** (the published `multer-storage-cloudinary` is unmaintained and pins the v1 SDK). Falls back to local disk when no Cloudinary keys are set. |
| **Failed-upload cleanup** | The error handler deletes the already-uploaded image on any failed request, so a rejected validation doesn't orphan a file. |
| **Search** | Regex search across title/artist/address/description/tags, with user input escaped so `a(` can't blow up as an invalid regex. Tag and art-form facets are computed with an aggregation pipeline to drive the filter chips. |

---

## Endpoints

### Public

| Method | Path | Notes |
| --- | --- | --- |
| `GET` | `/api/health` | Liveness probe. Answers before the DB connects. |
| `GET` | `/api/artworks` | Explore feed. Query: `q`, `tag`, `form`, `sort` (`recent`\|`oldest`\|`title`), `page`, `limit` (max 48). Returns `{ artworks, pagination }`. |
| `GET` | `/api/artworks/facets` | Tag and art-form counts for the filter UI. |
| `GET` | `/api/artworks/:aid` | Single artwork. |
| `GET` | `/api/artworks/user/:uid` | A contributor's artworks. **Returns `[]`** for a contributor with none — not a 404. |
| `GET` | `/api/users` | All contributors (never includes password hashes). |
| `POST` | `/api/users/signup` | `multipart/form-data`: `name`, `email`, `password`, `image`. |
| `POST` | `/api/users/login` | JSON: `email`, `password`. |

### Authenticated (`Authorization: Bearer <token>`)

| Method | Path | Notes |
| --- | --- | --- |
| `POST` | `/api/artworks` | `multipart/form-data`: `title`, `description`, `address`, `image`, optional `artist`, `form`, `tags` (comma-separated). Geocodes the address, then writes in a transaction. |
| `PATCH` | `/api/artworks/:aid` | JSON. Owner only. Photo and location are immutable by design. |
| `DELETE` | `/api/artworks/:aid` | Owner only. Removes the Cloudinary asset after the transaction commits. |

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
npm run seed              # optional: 3 demo contributors + 12 artworks
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
npm run seed -- --reset   # wipe users + artworks first
```

Demo login: `maya@streetcanvas.demo` / `demo1234`.

The seed images are neutral placeholders — swap them for real street-art photos
in `scripts/seed-data.js` before taking screenshots.

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
CORS_ORIGIN            # e.g. https://your-frontend.web.app
GEOCODER_USER_AGENT    # e.g. StreetCanvas/1.0 (you@example.com)
```

**Note:** Vercel caps a function's request body at 4.5 MB, which is why uploads
are limited to 4 MB.

Running as a long-lived process instead (Render, Railway, a container) works too
— `npm start` runs [`server.js`](server.js), which binds a port and connects.

---

## Project layout

```
api/index.js        serverless entry point (exports the express app)
app.js              express app: middleware, routes, error handling
server.js           long-lived process entry point (binds a port)
controllers/        request handlers, wrapped in asyncHandler
routes/             route definitions + express-validator rules
models/             mongoose schemas
middleware/         auth, uploads, rate limiting, request/id validation
util/               db cache, geocoding, image store, async handler, helpers
scripts/seed.js     demo data loader (also used by dev:demo)
scripts/dev-server  zero-setup local demo on an in-memory database
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
- Uploads restricted by MIME type and capped at 4 MB.
- Login returns an identical response whether the email or the password was
  wrong, so the endpoint can't be used to enumerate registered accounts.
