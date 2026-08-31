# Design notes — Web

Why the code is the way it is. Written as the questions a reviewer is most
likely to ask, with short answers.

---

### Why does the filter state live in the URL instead of `useState`?

So a filtered view can be shared, bookmarked, and restored with the back button.
`/?tag=unesco&category=monastery` is a real, linkable page. `useSearchParams`
gives it to me for free, and it means there's exactly one source of truth — no
chance of the URL and the component disagreeing.

Defaults are omitted from the URL rather than written into it, so the common
case stays a clean `/`.

### Why is only the search box debounced?

Typing fires a change per keystroke, and each one would be a request. The
dropdowns don't have that problem — one change, one request — and debouncing
them would just make the UI feel laggy. So `useDebounce` wraps the text term
only, and the selects update immediately.

### Why is "near me" stored in the URL as `near=me` and not as coordinates?

The intent survives a refresh, the coordinates don't go in the address bar, and
a link someone shares doesn't leak where they were standing. The page treats the
filter as active only when the URL says so *and* the browser has actually
returned a position.

Related: geolocation is never requested on mount. An unprompted permission
dialog on page load is hostile, browsers increasingly ignore it, and asking on
click makes it obvious what the prompt is for.

### What is `AbortController` doing in the HTTP hook?

If you navigate away while a request is still in flight, the response arrives
for a component that no longer exists. `useHttpClient` keeps the controller for
every in-flight request and aborts them all on unmount. An abort is then ignored
rather than shown as an error, because it isn't a failure — I caused it.

### Why CSS custom properties instead of Sass variables?

Sass variables are compiled away, so every component ends up with a literal
colour baked in. Custom properties stay in the browser, which means one
definition in `src/styles/_tokens.scss` controls the whole app — and it is what
makes the light theme a redefinition of the same token names under
`[data-theme="light"]` rather than an edit to every stylesheet. The old version
of this app hardcoded hex values in each component, which is exactly the problem.

The token names are semantic (`--surface`, not `--grey-800`) for the same
reason: a component asks for "the raised surface colour" and never needs to know
which theme is active.

### Why doesn't the theme default to dark or light?

Until the visitor presses the toggle, no `data-theme` attribute is written at
all, so the stylesheet falls through to `prefers-color-scheme` and follows the
operating system — including if the OS flips while the tab is open. Writing a
default on load would override a preference the visitor already expressed
system-wide. Once they choose explicitly, the choice is stored and wins.

### Why skeleton cards instead of a spinner?

The skeleton is the same shape and size as the real card, so when the data
arrives nothing moves. A spinner in an empty container means the page collapses
and then jumps when results appear.

### Why one `PlaceForm` for both create and edit?

The tutorial this grew out of had two near-identical page components. Adding a
field meant editing both, and they'd drift. Now there's one form with a `mode`
prop, and the only conditional parts are the two fields that genuinely only
apply on create — the photo and the address, because the API doesn't re-upload
or re-geocode on an edit.

### What's the banner about when the site first loads?

The API runs on free hosting that doesn't keep it awake between visits, so the
first request in a while pays a cold start. Originally every page fired its
request immediately, the request failed, and the user got a modal saying
**"An Error Occurred! / Failed to fetch"** — which reads as a broken site.

Now `useServerStatus` probes `/api/health` on load, pages hold their first
request until it answers, and a banner explains the wait. The page itself
renders straight away, so a warm server costs nothing visible.

**Tradeoff to mention:** I did consider letting each request fail and handling
it individually. I chose the shared probe because on a cold start *every*
request fails at once, and three simultaneous error panels are worse than one
honest explanation.

### Why duplicate the server's validation rules and category list on the client?

`shared/util/tags.js` and `places/util/constraints.js` restate limits the API
already enforces, and `places/util/categories.js` restates its `CATEGORIES`
enum. That's intentional: without it, you'd type a 30-character tag, see it
accepted as a chip, submit, and have the server silently drop it. Client
validation is for feedback; the server still validates everything, because a
client can't be trusted.

Each file names the server file it mirrors, so the next person knows which one
is authoritative. `labelForCategory` deliberately falls back to the raw slug
rather than "Other" — if the two lists ever drift, showing the unknown value is
more honest than filing it under a real category.

### Why write your own form validation instead of React Hook Form?

Honest answer: the biggest form here is seven fields, and `useForm` +
`validate()` is about 80 lines with no dependency. I've used React Hook Form
with Yup elsewhere (it's in another project in my portfolio) and I'd reach for
it on anything with conditional fields, field arrays, or a big schema — it
handles re-render performance and schema validation far better than this does.

### Why not TanStack Query for the data fetching?

Same reasoning. This app has a handful of endpoints and no cross-page cache
requirements, so `useHttpClient` covers it. If I needed caching, background
refetching, or optimistic updates beyond the one place that does them by hand,
hand-rolling that would be a mistake and I'd use TanStack Query.

### Why are the saved lists optimistic, when nothing else is?

Starring a place is a single boolean flip and the only feedback is the button
itself, so a round trip's worth of delay is the whole interaction. `useSavedState`
flips the local Set immediately and puts the previous state back if the request
fails, so the UI never quietly disagrees with the server. It also mirrors the
server's rule that saving to one list removes the place from the other — if it
didn't, a card could briefly show as both "want to go" and "been here".

Context holds only the ids, as two Sets, because the only question a card asks
is "am I in this list?". The `/saved` page fetches the full records separately,
since rendering them needs more than an id.

If the lists fail to load, the failure is swallowed: they're an enhancement, and
the catalogue works without them.

### Why does the trip planner live in `localStorage` instead of the database?

A trip is a scratch list you assemble in a few minutes and then act on, not a
record worth an account, a table and a set of endpoints. Keeping it client-side
means it also works signed out, which is when someone is most likely to be
sizing the app up. Surviving a refresh is all the persistence it needs, and a
write that fails (private browsing, full quota) is swallowed rather than allowed
to break the interaction.

It stores whole place objects rather than ids, so the panel renders without
refetching — the visitor has already seen this data, and the list is capped at
nine stops.

### Why nine stops?

More than that stops being a day out, and Google Maps' directions URL caps the
waypoint list anyway. The cap is enforced in the state hook and exposed as
`isFull`, so the card can disable its button rather than letting you press
something that silently does nothing.

### Why compute the route in the browser instead of using a routing API?

`trip/util/route.js` is pure maths: haversine distances, a greedy
nearest-neighbour ordering, and a Google Maps directions URL built from the
plain link scheme. No key, no account, no per-request cost.

The trade is real and the UI states it rather than hiding it: distances are
straight-line, so the time estimate applies a road-detour factor and an average
speed, and the ordering is a good guess rather than an optimal tour — finding
the true shortest one is NP-hard. For "which four monasteries should I string
together today", a heuristic that runs in microseconds is the right answer.

### Why is `markers` wrapped in `useMemo`?

`Map` re-runs its effect whenever the `markers` array identity changes. Building
a fresh array on every render meant every keystroke tore down and rebuilt all the
pins and refit the map bounds. Memoising on `[places]` means it only rebuilds
when the data actually changes. The trip panel does the same for the route it
draws.

### Why a custom Leaflet marker instead of the default?

Leaflet's default marker points at PNG files resolved relative to its CSS, and
a bundler doesn't rewrite those paths — the usual result is an invisible marker.
A `divIcon` is just an HTML element I style myself, so there's no asset to break,
and it matches the theme. The dark map is a CSS filter over plain OpenStreetMap
tiles for the same reason: the good-looking dark basemaps all want an API key.

### Why does the API's `creator` field never need a type check?

Because the API always populates it. Every endpoint that returns a place returns
its creator as an object with `id`, `name` and `image` — including the one right
after a create. Normalising once at the boundary means no component has to ask
"is this an object or an id?"
