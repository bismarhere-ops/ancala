# Session Handoff — Forest Guardian web (next workstream: Instagram feed)
_Updated: 2026-10-20 · end of the main build session_

## State
Site built and pushed (`b8c33bc`, CI green); Instagram feed not started. Nothing about it is decided yet, not even the account.

## Done this session (verified)
- Branch `claude/forest-guardian-website-XwOXh`: local and origin both at `b8c33bc`, working tree clean (checked 2026-10-20).
- CI (`ci.yml`) passed on `b8c33bc` (run 36404825499, 2026-09-28): server tests and the web typecheck/lint/build.
- Last Netlify deploy I confirmed live: `fc8283d` (redesign), published 2026-09-27 03:50 UTC on https://ancala.netlify.app.
- 129 server tests passed locally on `b8c33bc`.
- Preparation checklist (71 items, from the owner's "Journey of Jejak Ancala" sheet): saves progress per trail; checked in a browser on the trail page and the dashboard.
- React hydration error (Badge `<div>` inside `<p>`) fixed; dev build showed zero hydration warnings on `/`, `/trails`, `/trails/arjuno`, `/dashboard`.

## In progress
- Nothing half-built in code. The Instagram feed exists only as the owner's request ("make another session for this web instagram feed").

## Next action
Ask the owner (one AskUserQuestion) for: (1) the Instagram account to show (handle); (2) whether it is a Business/Creator account they can log in to; (3) where the feed goes (Community page, home page, or per-trail). Build nothing before these answers.

## Open decisions / blockers
- **Instagram integration method** (not chosen). Re-check Meta's current rules before building; this list is from memory, not verified this session:
  - Official Instagram API (Business/Creator account, Meta app, long-lived token that must be refreshed). Needs the token stored as a Netlify env var and a refresh job.
  - Embedding individual posts with Instagram's embed script (no token, but posts are picked by hand).
  - A hosted widget service (Behold, LightWidget, Elfsight…): least code, third-party dependency.
  - Hand-curated JSON of post URLs + our own cards (works offline, needs manual updates).
- **Can't test from this sandbox:** instagram.com, graph.instagram.com, the Instagram image CDN and *.netlify.app are very likely blocked like Wikipedia was (unconfirmed for Instagram, so check first: `curl -sS -o /dev/null -w "%{http_code}" https://graph.instagram.com/`). If blocked, the owner must add the hosts under environment Network access and start a fresh session (last time the setting didn't reach the running session).
- **Netlify deploy of `b8c33bc` is unverified.** The owner declined the Netlify API call on 2026-09-29. Ask before calling any Netlify tool again; otherwise ask the owner to check the Deploys page.
- **Safety: advisories are stale.** All 30 hand-written closure advisories in `server/data/advisories.json` were sourced on 2026-09-26. Fire-season closures (Kemenhut SE.4/KSDAE, West Java governor circular No. 116) may have lifted. The daily sync jobs never touch hand-written entries. Re-verify before any other work goes live.
- Carried over, owner action needed: card photos (allow `e52111db-pop-up-mountain-trail-map.netlify.app`, `upload.wikimedia.org`, `commons.wikimedia.org`, `en.wikipedia.org`, or share a Drive folder); `ANTHROPIC_API_KEY` secret (advisory review agent still failing weekly, most recently 2026-10-20); NASA FIRMS key for the wildfire feed.
- Carried over, data: 8 mountains without sourced summit coordinates and open elevation disputes, listed at the end of `RESEARCH-REVIEW.md`.

## Decisions already made (do not relitigate)
- Site name stays **Forest Guardian**: owner chose it over "Ancala Trails".
- Never invent data: unknown values show as "Unknown"/"—" or the section is hidden. Owner's rule since the dataset brief.
- Telemetry: real phone GPS by default plus a Demo mode labelled DEMO on every panel; owner chose "Both".
- SOS: `tel:112`, `tel:115` (Basarnas), SMS with coordinates; owner chose it.
- Photos: owner's photo site first, then Wikipedia/Wikimedia with credit, otherwise the drawn outline. Spec Unsplash photos removed (unverified, several were other mountains).
- Advisories: `danger` only for official closures or bans; `warning` for partial limits; each needs a source URL.
- Checklist uses only item lists from the owner's sheet; no member names, prices, vendors or the member/MBTI tabs.
- Push only to `claude/forest-guardian-website-XwOXh`; Netlify auto-deploys from it. No PRs unless the owner asks.

## Gotchas / do-not-touch
- Netlify builds only when `web/`, `server/`, `netlify.toml` or the root `package*.json` change (the `ignore` rule in `netlify.toml`).
- Remote images need their host in `web/next.config.mjs` `images.remotePatterns` (currently only `upload.wikimedia.org`).
- `web/public/sw.js` lets cross-origin requests through (it only caches OpenTopoMap tiles), so remote feed images won't work offline unless handled.
- On Netlify the API is a function with a `/tmp` SQLite DB that resets on cold start. Store any token in Netlify env vars and keep anything durable out of the DB. Never commit secrets.
- Never `pkill -f "node server"` / `pkill -f "next dev"`: the pattern matches the shell running it and kills it (exit 144). Free ports with `fuser -k <port>/tcp`.
- Server components reach the API through `NETLIFY_SITE_URL`, baked in at build (`web/next.config.mjs`). Don't remove it, or pages render empty on Netlify.
- Route tests use their own empty advisories file (`ADVISORIES_PATH` in `server/routes/trails.test.js`); keep new route tests isolated from live data the same way.
- "File changed on disk" notices showed up repeatedly this session while `git status` stayed clean. Trust git.
- Commit trailer: `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` + `Claude-Session: …` link from the system reminder.
