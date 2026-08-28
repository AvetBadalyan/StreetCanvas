# StreetCanvas — Web

Frontend for **StreetCanvas**, a crowd-mapped atlas of street art. Browse murals,
stencils and paste-ups on a shared map, filter by tag or art form, and pin the
ones you discover.

- **API repo:** https://github.com/AvetBadalyan/MERN-practice-backend
- **Stack:** React 18 · React Router 6 · Sass · Leaflet
- **[Design notes](NOTES.md)** — why the non-obvious parts are the way they are

---

## Features

- **Explore feed** — searchable, tag- and form-filterable grid with pagination.
  All filter state lives in the URL, so any view can be linked or bookmarked and
  the back button behaves.
- **Map view** — every result plotted on a dark Leaflet basemap, auto-fitted to
  the visible set.
- **Contribute** — upload a photo (drag-and-drop, validated client-side), give an
  address, and the API geocodes it onto the map.
- **Tag editor** — chip-style input with popular-tag suggestions, normalised to
  match the server's own rules so what you type is what gets stored.
- **Demo account** — one click into a populated account; no sign-up needed to
  look around.
- **Cold-start handling** — see below.

---

## The cold-start problem

The API is hosted on a free tier that suspends after inactivity. The first
request in a while can take up to a minute.

Previously every page fired its request immediately, the request failed, and the
user got a modal saying **"An Error Occurred! / Failed to fetch"** — which reads
as a broken site rather than a sleeping one.

Now [`use-server-status.js`](src/shared/hooks/use-server-status.js) probes
`/api/health` on load and retries with a delay while the server boots. The app
holds back a wake-up screen with a progress indicator and an explanation, and
only renders once the API answers. If it never does, the user gets a real
explanation and a retry button instead of a stack-trace message.

The HTTP layer also distinguishes a *network* failure from an *API* error, so
"we couldn't reach the server" and "that title is too short" are no longer the
same message.

---

## Architecture notes

- **`src/shared/api/`** — all endpoint knowledge in one place. Components call
  `fetchArtworks(...)`, not `fetch(process.env.REACT_APP_BACKEND_URL + "/places")`.
  The API also normalises its own responses (every artwork arrives with its
  `creator` populated), so no component has to handle a field that is sometimes
  an object and sometimes an id.
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
src/
  artworks/      explore, create, edit, contributor pages + components
  user/          auth and contributor pages
  shared/
    api/         endpoint wrappers + URL/asset resolution
    components/  form elements, UI elements, navigation
    hooks/       http, auth, debounce, server-status
    context/     auth context
  styles/        design tokens + mixins
```

---

## Local setup

```bash
npm install
npm start
```

Runs at `http://localhost:3000` and expects the API at `http://localhost:5000`.

### Environment

```
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_ASSET_URL=http://localhost:5000
```

`.env` is used for development, `.env.production` for builds. Both are committed
because `REACT_APP_*` values are **baked into the JavaScript bundle and publicly
readable** — never put a secret in one.

### Build & deploy

```bash
npm run build
firebase deploy      # or any static host
```

Set `REACT_APP_API_URL` in `.env.production` to your deployed API before
building. Any static host works; the app is a SPA, so configure a catch-all
rewrite to `/index.html` (already set in [`firebase.json`](firebase.json)).
