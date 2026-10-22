# Session Handoff — Forest Guardian: code review findings
_Updated: 2026-10-22 · paused by owner (switching to another project)_

## State
Multi-agent code review paused: 74 distinct findings; 31 checked by 2 independent verifiers (30 confirmed, 1 rejected); 29 medium unchecked; 14 low set aside unchecked. Nothing fixed yet except #3.

## Done this session (verified)
- `af77005` (pushed): home page filled with real content (Bromo featured card with the owner's photos, "Conditions now" map + counts + closures list); `web/lib/trail-status.ts` gives one status per trail (closed = !plannable). Typecheck, lint, 129 tests, build, desktop+mobile screenshots all OK.
- Review finding #3 (closed trails shown amber) is FIXED in `af77005`.
- Another session pushed `7a312b8` (Instagram feed on /community) and `ac75b9b` (advisories: Arjuno-Welirang closed again, Sumbing fire). My work is rebased on top; no conflicts.

## Confirmed findings, not yet fixed (2/2 verifiers each, most severe first)
1. Upload keeps the client's file extension, so .html/.svg is served from the site origin (stored XSS) — `server/middleware/upload.js:17`
2. Offline lookup serves the OLDEST cached copy (precache/runtime) over the fresh pack; "Update packs" has no effect offline — `web/public/sw.js:96`
3. Offline packs save page HTML but not its JS/CSS chunks; offline trail page never hydrates (SOS dead), telemetry crashes — `web/lib/offline.ts:105`
4. GPS altitude noise is counted as climb; "ETA by your climb rate" hours too short — `web/lib/use-gps.ts:86`
5. Sync workflow commits with "[skip ci]", so Netlify never deploys auto volcano/fire advisories — `.github/workflows/sync-advisories.yml:45`
6. Public GET /api/reports exposes reporter name + email — `server/routes/reports.js:44`
7. Review-agent workflow: unrestricted Bash/WebFetch + write token on the unprotected production branch — `.github/workflows/review-advisories.yml:46`
8. Advisory date validator accepts non-ISO dates that are compared as text, so a closure can be hidden — `server/lib/advisories.js:39`
9. Advisory windows use the UTC date; local-date closures start 7–9 h late — `server/routes/trails.js:226`
10. Unknown distance/time/gain stored as 0 and shown as "0.0 km", "0 min" — `server/import-mountains.js:245`
11. Saved plan for a since-closed trail silently becomes another mountain (and its rescue contact) — `web/components/plan-provider.tsx:78`
12. Dashboard weather always shows the most popular trail (Andong), unlabelled — `web/app/dashboard/page.tsx:21`
13. Walked distance never builds up (small steps discarded but still become the anchor) — `web/lib/use-gps.ts:84`
14. No-checkpoint fallback halves the ascent time and shows it as "Guide ETA" — `web/lib/telemetry.ts:39`
15. Raung's final crater-rim traverse segment is dropped (timeline 3 h short) — `server/import-mountains.js:160`
16. Andong summit coordinate is ~27–30 km from the real mountain — `server/data/mountains.csv:29`
17. Pack download reports "Packs saved"/OFFLINE READY even when files failed — `web/lib/offline.ts:152`
18. Offline, any directory filter/search/island tab/Topo Map link lands on offline.html — `web/components/trail-directory.tsx:67`
19. Netlify build never loads server data; a malformed advisories.json ships and crashes the API — `netlify.toml:10`
20. Planner ignores the planned date; future-dated closures are hidden (medium) — `server/routes/trails.js:211`
21. Telemetry never shows "check PVMBG alert level" for conditional volcanoes (medium) — `web/components/telemetry/telemetry-view.tsx:279`
22. Render: every user shares one rate-limit bucket (medium) — Render deploy only
23. SW caches opaque OpenTopoMap tile responses incl. errors forever (medium) — `web/public/sw.js`
24. Uploads written before validation, never deleted on rejection, no quota (medium) — `server/routes/reports.js`
25. Weather cache is an unbounded Map keyed by caller coordinates (medium) — `server/routes/weather.js`
26. Multer client errors become 500s; raw internal messages returned (medium) — `server/middleware/error.js`
27. data_reliability_tier added without a migration; old DBs crash at boot (medium) — `server/db.js`
28. Advisory with an unmatched trail slug is silently dropped at boot (medium) — `server/lib/advisories.js`
29. Live grade always "—" at hiking speed (30-fix window can't span 40 m) (medium) — `web/lib/use-gps.ts`
Rejected (1/2): "no staleness handling for advisories" — but the owner should still re-verify the 26 Sep advisories manually.

## In progress
- Review verification paused at finding index r1-31 of 60 (sorted by severity). Resume only works in THIS session:
  `Workflow({scriptPath: "/root/.claude/projects/-home-user-ancala/d27dc35a-0141-5fa2-b931-4896d49c3413/workflows/scripts/forest-guardian-review-wf_49963ac7-ee8.js", resumeFromRunId: "wf_49963ac7-ee8", args: {"today":"2026-10-20"}})`. Each 5-hour quota window verifies ~10–17 findings.

## Next action
Ask the owner which to do first: fix confirmed findings 1–6 (security + offline + deploy) or resume the review for the remaining 29 medium findings. Do not start either without a yes.

## Open decisions / blockers
- Fix-first vs finish-review: owner's call (both share the same 5-hour usage limit).
- Advisories are from 2026-09-26 (plus ac75b9b updates); re-verify closures before relying on them.
- Photos for other mountains still blocked (owner's photo site / Wikimedia hosts not reachable from the sandbox).

## Decisions already made (do not relitigate)
- Never invent data; unknown → "—" or hidden. Owner rule.
- Site name stays Forest Guardian; push only to `claude/forest-guardian-website-XwOXh`; no PRs unless asked.
- Telemetry = real GPS + labelled Demo; SOS = tel:112/115 + SMS.

## Gotchas / do-not-touch
- Another session also pushes to this branch (Instagram feed, advisories): always `git fetch` + rebase before pushing.
- Never `pkill -f "node server"`/`"next dev"` (kills the calling shell); use `fuser -k <port>/tcp`.
- Netlify rebuilds only when `web/`, `server/`, `netlify.toml` or root `package*.json` change.
- Owner declined Netlify API calls on 2026-09-29: ask before using Netlify tools.
