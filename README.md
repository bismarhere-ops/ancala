# Forest Guardian

A CSR platform for hikers and forest communities — trail information, hiker dashboards,
volunteer registration, and transparent impact reporting.

This repository is a small monorepo:

- **Backend API** (`server/`) — Node.js + Express + SQLite
- **Frontend app** (`web/`) — Next.js 14 (App Router) + Tailwind CSS + shadcn/ui

The Next.js app talks to the API via same-origin `/api/*` rewrites configured in
`web/next.config.mjs`, so you can point it at any backend with a single env var.

## Running the full stack locally

Open two terminals:

```bash
# 1) API (port 3000)
cp .env.example .env
npm install
npm start

# 2) Frontend (port 3001)
cd web
cp .env.local.example .env.local
npm install
npm run dev   # http://localhost:3001
```

## Tech stack

| Layer    | Choice                                              | Why                                                      |
| -------- | --------------------------------------------------- | -------------------------------------------------------- |
| Runtime  | Node.js 18+                                         | Stable LTS, built-in `fetch` for the weather proxy.       |
| Web      | Express 4                                           | Battle-tested, tiny surface area.                        |
| DB       | SQLite via `better-sqlite3`                          | Zero-config, fast, embedded — easy to scale out later.   |
| Validation | `zod`                                             | Strict request schemas, clean 400 errors.                |
| Uploads  | `multer` (disk storage, image MIME whitelist)        | Accepts up to 4 photos per report.                       |
| Security | `helmet`, `cors`, `express-rate-limit`              | Sensible defaults for a public endpoint.                 |
| Weather  | Open-Meteo (keyless) with deterministic mock fallback | Works offline/in CI, degrades gracefully.             |

## Quick start

```bash
cp .env.example .env
npm install
npm start                 # http://localhost:3000
# or
npm run dev               # auto-restart (Node --watch)
```

The database is created and seeded automatically on first boot
(`data/forest-guardian.db`). To reset:

```bash
npm run reset-db
```

## API

Base URL: `/api`. JSON in, JSON out. All errors use the shape
`{ "error": "<code>", "message": "...", "details"?: ... }`.

### Health

| Method | Path          | Description            |
| ------ | ------------- | ---------------------- |
| GET    | `/api/health` | Liveness + version info |

### Trails

| Method | Path                              | Description                                         |
| ------ | --------------------------------- | --------------------------------------------------- |
| GET    | `/api/trails`                     | List. Query: `q`, `difficulty`, `region`, `sort`, `limit`, `offset` |
| GET    | `/api/trails/:slug`               | Trail detail with checkpoints                        |
| GET    | `/api/trails/:slug/guide`         | Downloadable offline guide (JSON file)               |

`sort` accepts: `popular` (default), `distance`, `elevation`, `time`, `name`.

### Weather

| Method | Path                                         | Description                                     |
| ------ | -------------------------------------------- | ----------------------------------------------- |
| GET    | `/api/weather?slug=<slug>`                   | 5-day forecast for a trail                       |
| GET    | `/api/weather?lat=<lat>&lng=<lng>`           | 5-day forecast for arbitrary coordinates         |

Cached in-memory for 10 minutes per coordinate. Falls back to a deterministic
mock if the upstream provider fails.

### Reports (trail conditions)

| Method | Path                | Description                                                     |
| ------ | ------------------- | --------------------------------------------------------------- |
| POST   | `/api/reports`      | Create report. Accepts JSON or `multipart/form-data` with up to 4 photos under the field `photos`. |
| GET    | `/api/reports`      | List reports. Query: `trailSlug`, `status`, `limit`, `offset`.   |
| GET    | `/api/reports/:id`  | Single report.                                                  |

Allowed photo MIME types: `jpeg`, `png`, `webp`, `heic`. Max 8 MB per file by default.

### Volunteers

| Method | Path                     | Description                                   |
| ------ | ------------------------ | --------------------------------------------- |
| POST   | `/api/volunteers`        | Register as a Forest Guardian.                |
| GET    | `/api/volunteers/stats`  | Aggregate counts for the landing page.        |

### Impact dashboard

| Method | Path           | Description                                        |
| ------ | -------------- | -------------------------------------------------- |
| GET    | `/api/impact`  | Public KPIs (trees, waste, guardians, trails, etc.) |

## Project layout

```
server/
├── server.js            # Express entry + static PWA serving
├── config.js            # Typed env config
├── db.js                # SQLite schema, migrations, seed (idempotent)
├── routes/
│   ├── trails.js
│   ├── weather.js
│   ├── reports.js
│   ├── volunteers.js
│   └── impact.js
├── middleware/
│   ├── error.js         # HttpError + central handler
│   └── upload.js        # Multer config + MIME whitelist
├── data/
│   └── seed-trails.json # Initial trail catalogue
└── uploads/             # User-uploaded photos (gitignored)
```

## Design notes

- **Offline-friendly contract.** Every endpoint returns small JSON payloads and the
  trail guide is downloadable, which lets the frontend cache it in the service
  worker or save it to a user's device for low-signal hikes.
- **Idempotent seed.** `db.js` seeds trails + impact metrics on first boot but
  never overwrites existing data unless `--reset` is used — safe for restarts.
- **Graceful weather fallback.** When Open-Meteo is unreachable, a deterministic
  mock forecast is returned so the UI is never empty.
- **Anonymous reporting.** Reports may be submitted anonymously; when anonymous,
  reporter fields are stripped before storage.
- **Validation at the edge.** All request bodies/queries are validated with Zod —
  the handlers below that point can assume well-formed input.

## Frontend (`web/`)

Built with **Next.js 14 App Router**, **Tailwind CSS**, and **shadcn/ui** primitives.
Pages:

| Route                 | Purpose                                                        |
| --------------------- | -------------------------------------------------------------- |
| `/`                   | Hero, quick actions, featured trails, live impact, join CTA   |
| `/trails`             | Filterable trail list (search, difficulty, sort)              |
| `/trails/[slug]`      | Checkpoints, hazards, 5-day weather, downloadable offline guide |
| `/dashboard`          | Trip planner, checklists, emergency contacts — saved locally   |
| `/program`            | Pillars, Plant & Protect tracker, bootcamp, impact dashboard  |
| `/community`          | Report form (photos + GPS), recent reports, volunteer sign-up |

Design notes:
- **Mobile-first, offline-friendly.** System font stacks (no Google Fonts), small
  route bundles (~103–170 kB first load), every trail page exposes a JSON offline
  guide.
- **Server components by default**, with client components only where interactivity
  demands it (planner, checklists, forms, geolocation).
- **Forms** use `react-hook-form` + `zod` for validation and `sonner` for toasts.
- **Persistence** for the planner, checklists, and emergency contact uses
  `localStorage`, so data survives reloads and works without signal.

## Next steps

- Auth for an admin surface to update impact metrics and change report status.
- Service worker + install-prompt for true PWA install.
- Background job to refresh the weather cache for popular trails.
