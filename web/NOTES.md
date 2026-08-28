# Design notes — Web

Why the code is the way it is. Written as the questions a reviewer is most
likely to ask, with short answers.

---

### Why does the filter state live in the URL instead of `useState`?

So a filtered view can be shared, bookmarked, and restored with the back button.
`/?tag=stencil&form=mural` is a real, linkable page. `useSearchParams` gives it
to me for free, and it means there's exactly one source of truth — no chance of
the URL and the component disagreeing.

### Why is only the search box debounced?

Typing fires a change per keystroke, and each one would be a request. The
dropdowns don't have that problem — one change, one request — and debouncing
them would just make the UI feel laggy. So `useDebounce` wraps the text term
only, and the selects update immediately.

### What is `AbortController` doing in the HTTP hook?

If you navigate away while a request is still in flight, the response arrives
for a component that no longer exists. `useHttpClient` keeps the controller for
every in-flight request and aborts them all on unmount. An abort is then ignored
rather than shown as an error, because it isn't a failure — I caused it.

### Why CSS custom properties instead of Sass variables?

Sass variables are compiled away, so every component ends up with a literal
colour baked in. Custom properties stay in the browser, which means one
definition in `src/styles/_tokens.scss` controls the whole app — and adding a
light theme later would be a matter of redefining them under a selector rather
than editing every stylesheet. The old version of this app hardcoded hex values
in each component, which is exactly the problem.

### Why skeleton cards instead of a spinner?

The skeleton is the same shape and size as the real card, so when the data
arrives nothing moves. A spinner in an empty container means the page collapses
and then jumps when results appear.

### Why one `ArtworkForm` for both create and edit?

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

### Why duplicate the server's validation rules on the client?

`shared/util/tags.js` and `artworks/util/constraints.js` restate limits the API
already enforces. That's intentional: without it, you'd type a 30-character tag,
see it accepted as a chip, submit, and have the server silently drop it. Client
validation is for feedback; the server still validates everything, because a
client can't be trusted.

Both files name the server file they mirror, so the next person knows which one
is authoritative.

### Why write your own form validation instead of React Hook Form?

Honest answer: the form is five fields, and `useForm` + `validate()` here is
about 80 lines with no dependency. I've used React Hook Form with Yup elsewhere
(it's in another project in my portfolio) and I'd reach for it on anything with
conditional fields, field arrays, or a big schema — it handles re-render
performance and schema validation far better than this does.

### Why not TanStack Query for the data fetching?

Same reasoning. This app has a handful of endpoints and no cross-page cache
requirements, so `useHttpClient` covers it. If I needed caching, background
refetching, or optimistic updates, hand-rolling that would be a mistake and I'd
use TanStack Query.

### Why is `markers` wrapped in `useMemo`?

`Map` re-runs its effect whenever the `markers` array identity changes. Building
a fresh array on every render meant every keystroke tore down and rebuilt all the
pins and refit the map bounds. Memoising on `[artworks]` means it only rebuilds
when the data actually changes.

### Why a custom Leaflet marker instead of the default?

Leaflet's default marker points at PNG files resolved relative to its CSS, and
webpack doesn't rewrite those paths — the usual result is an invisible marker. A
`divIcon` is just an HTML element I style myself, so there's no asset to break,
and it matches the theme.

### Why does the API's `creator` field never need a type check?

Because the API always populates it. Every endpoint that returns an artwork
returns its creator as an object with `id`, `name` and `image` — including the
one right after a create. Normalising once at the boundary means no component
has to ask "is this an object or an id?"
