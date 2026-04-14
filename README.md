# Forest Guardian

A CSR platform for hikers and forest communities — trail information, hiker dashboards,
volunteer registration, and transparent impact reporting.

This repository currently contains:

- **Backend API** (`server/`) — Node.js + Express + SQLite
- **Frontend pages** (`*.html`) — a lightweight, mobile-first PWA served statically by the API

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

## Next steps

- Front-end assets: stylesheet, JS modules, PWA manifest, and service worker are
  referenced by the HTML pages and will be added in the next iteration.
- Auth for an admin surface to update impact metrics and change report status.
- Background job to refresh the weather cache for popular trails.
