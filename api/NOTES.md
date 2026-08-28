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

### Why use a transaction to create an artwork?

Creating one writes to two places: the `artworks` collection, and the `artworks`
array on the user document. If the process died between those two writes, I'd
have an artwork nobody owns, or a user pointing at an artwork that doesn't
exist. A transaction makes both land or neither.

**Follow-up you should expect:** *"Do transactions work on any MongoDB?"* No —
they need a replica set. Atlas gives you one by default. That's also why the
local demo (`npm run dev:demo`) starts an in-memory **replica set** rather than
a plain in-memory server.

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

### Does the search use an index?

No, and that's deliberate. It's a case-insensitive regex across five fields, and
a regex that isn't anchored to the start of a string can't use an index — so it
scans the collection. At this size that's irrelevant. The next step would be a
MongoDB text index, which is fast but only matches whole words, so I'd be
trading substring search for speed.

The indexes that *do* matter are declared in `models/artwork.js`: `createdAt`
for the default sort, and `{ creator, createdAt }` for a contributor's page.

### What does the `/facets` aggregation do?

It produces the counts on the filter chips. `$unwind` turns one artwork with
three tags into three rows, `$group` counts them per tag, `$sort` puts the
popular ones first. The point is that the UI never offers a filter that would
return zero results.

It's also the one endpoint with a `Cache-Control` header — the counts only
change when someone adds or deletes an artwork, so a short shared cache saves a
function invocation on most page loads.
