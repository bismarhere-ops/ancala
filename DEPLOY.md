# Deploying Forest Guardian to a public URL

Two supported hosts, both configured in the repo:

- **Netlify** (`netlify.toml`): one site. The Next.js frontend runs on
  Netlify's Next.js runtime and the Express API runs as a Netlify Function.
- **Render** (`render.yaml`): two services, the frontend and the API.

## Netlify (about 5 minutes)

1. Go to **https://app.netlify.com** → **Add new site** → **Import an
   existing project** → **GitHub**.
2. Pick **`bismarhere-ops/ancala`**, branch
   **`claude/forest-guardian-website-XwOXh`**.
3. Leave the build settings as Netlify fills them in. It reads
   `netlify.toml` (base `web`, build command, functions, redirects). Click
   **Deploy**.
4. When the deploy finishes, trigger **one more deploy** (Deploys → Trigger
   deploy). The first build prerenders the home and dashboard pages before
   the API function exists, so they start out empty. The second build fills
   them in. They would also refresh on their own within about 5 minutes.

How it works: `/api/*` and `/uploads/*` are routed to `web/netlify/functions/api.js`,
which wraps the Express app with `serverless-http`. The SQLite database lives
in `/tmp` and rebuilds from `server/data/mountains.csv` on every cold start, so
the trail catalogue and advisories are always present. **Reports, photos and
volunteer sign-ups are not durable on Netlify**: they last only as long as a
function instance and are not shared between instances. Durable writes would
need an external database. The Render setup below keeps them until the next
redeploy.

## Render

The repo ships a **Render Blueprint** (`render.yaml`) that turns it into two
live web services. Render's free tier needs no credit card.

## Deploy (about 5 minutes)

1. Go to **https://render.com** and sign in with your GitHub account
   (`bismarhere@gmail.com`).
2. Click **New +** → **Blueprint**.
3. Choose the **`bismarhere-ops/ancala`** repository. If prompted for a branch,
   pick **`claude/forest-guardian-website-XwOXh`**.
4. Render reads `render.yaml` and shows two services —
   **forest-guardian-api** and **forest-guardian-web**. Click **Apply**.
5. Wait for both to go green (first build ~3–5 min). Open the URL on
   **forest-guardian-web** — that is your public link, e.g.
   `https://forest-guardian-web.onrender.com`.

Share that URL with anyone. No install, no terminals.

## What each service does

| Service | Role | URL |
|---|---|---|
| `forest-guardian-api` | Express + SQLite API | internal — the web service calls it |
| `forest-guardian-web` | Next.js site | **the public link you share** |

The web service proxies `/api/*` to the API server-side, so visitors only ever
touch the web URL. The `API_BASE_URL` wiring is automatic — the Blueprint
injects the API's hostname into the web service.

## Free-tier behaviour to expect

- **Cold starts.** After ~15 min idle, a free service sleeps and the next
  visit takes ~50 s to wake. Fine for a demo; upgrade to a paid instance
  (\$7/mo each) to keep it always-on.
- **Data resets on redeploy.** The 50 mountains re-seed from `mountains.csv`
  on every boot, so the catalogue is always intact. Submitted reports,
  uploaded photos, and volunteer sign-ups live on an ephemeral disk and reset
  when the service restarts. To keep them, add a Render **persistent disk**
  (paid) mounted at the API's data directory and set `DB_PATH` /
  `UPLOAD_DIR` to point at it.
- **Weather** shows a `mock` badge until the service can reach Open-Meteo; on
  Render it will use live data.

## Updating the live site

Every push to the `claude/forest-guardian-website-XwOXh` branch triggers an
automatic redeploy of both services. Nothing else to do.

## Other hosts

The app is a standard two-service Node monorepo, so Railway, Fly.io or any
container host work too — point the API at `PORT` and give the web service
`API_BASE_URL`. Render is the lowest-friction because the Blueprint is
already written.
