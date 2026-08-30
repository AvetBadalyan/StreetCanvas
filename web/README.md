# StreetCanvas — Web

Frontend for **StreetCanvas**, an atlas of public art. Browse sculptures, murals,
monuments and fountains on a map, filter them by artist, city, material or form,
and add the ones you find yourself.

- **Part of the [StreetCanvas](../README.md) monorepo** — the Express API lives in [`api/`](../api)
- **Stack:** React 18 · Vite · React Router 7 · Sass · Leaflet
- **[Design notes](NOTES.md)** — why the non-obvious parts are the way they are

---

## Features

- **Explore feed** — searchable, tag- and form-filterable grid with pagination.
  All filter state lives in the URL, so any view can be linked or bookmarked and
  the back button behaves.
- **Map view** — every result plotted on a Leaflet map, auto-fitted to the
  visible set.
- **Contribute** — upload a photo (drag-and-drop, validated client-side), give an
  address, and the API geocodes it onto the map.
- **Tag editor** — chip-style input with popular-tag suggestions, normalised to
  match the server's own rules so what you type is what gets stored.
- **Demo account** — one click into a populated account; no sign-up needed.
- **Cold-start handling** — see below.

---

## The cold-start problem

The API runs on free hosting that doesn't keep it awake between visits, so the
first request in a while pays a cold start.

Originally every page fired its request immediately, the request failed, and the
user got a modal reading **"An Error Occurred! / Failed to fetch"** — which looks
like a broken site rather than a sleeping one.

Now [`use-server-status.js`](src/shared/hooks/use-server-status.js) probes
`/api/health` on load and retries while the server boots. The page itself renders
straight away; pages hold only their *first data request* until the probe
answers, and a banner explains the wait. A warm server therefore costs nothing
visible, and a cold one costs a skeleton plus one honest sentence.

The HTTP layer also separates a *network* failure from an *API* error, so
"we couldn't reach the server" and "that title is too short" are no longer the
same message.

---

## Architecture notes

- **`src/shared/api/`** — all endpoint knowledge in one place. Components call
  `fetchArtworks(...)`, never a hand-built URL. The API also normalises its own
  responses (every artwork arrives with its `creator` populated), so no component
  has to handle a field that is sometimes an object and sometimes an id.
- **Limits are mirrored, deliberately** — `src/shared/util/tags.js` and
  `src/artworks/util/constraints.js` restate the server's rules so a field is
  rejected as you type rather than after a round trip. The server re-validates
  everything regardless; these files name it as the source of truth.
- **`src/styles/_tokens.scss`** — every colour, radius and shadow is a CSS custom
  property. Components reference tokens, never raw hex.
- **`useHttpClient`** — wraps a request with loading/error state and aborts
  anything in flight on unmount.
- **One form, two modes** — `ArtworkForm` serves both create and edit rather than
  duplicating a near-identical page component for each.
- **Skeletons over spinners** — the grid renders placeholder cards at the right
  size, so results don't cause a layout jump.

```
index.html       Vite entry point (lives at the project root, not in public/)
src/
  artworks/      explore, create, edit, contributor pages + components
  user/          auth and contributor pages
  shared/
    api/         endpoint wrappers + URL/asset resolution
    components/  form elements, UI elements, navigation
    hooks/       http, auth, debounce, server-status
    context/     auth and server-status context
  styles/        design tokens + mixins
```

Files containing JSX use the `.jsx` extension; plain modules (hooks, utilities,
API wrappers) stay `.js`.

---

## Local setup

Normally you'd start both halves together from the repository root:

```bash
npm run dev:demo     # api + web, no database setup needed
```

To run just this app (it expects the API already on `http://localhost:5000`):

```bash
npm install
npm run dev
```

Runs at `http://localhost:3000`.

### Environment

```
VITE_API_URL=http://localhost:5000/api
VITE_ASSET_URL=http://localhost:5000
```

Vite only exposes variables prefixed `VITE_`, and they are **compiled into the
bundle and publicly readable** — never put a secret in one. That is also why both
`.env` and `.env.production` are committed: they contain nothing but public URLs.

### Build & deploy

```bash
npm run build        # or from the repo root
npm run preview      # serve the production build locally
```

Output goes to `build/` rather than Vite's default `dist/`, so the existing
Vercel and Firebase configuration keeps working unchanged.

The app is a SPA, so any host needs a catch-all rewrite to `/index.html` —
already configured in [`vercel.json`](vercel.json) and
[`firebase.json`](firebase.json).
