# Live trail advisories — how to update them

When something happens in the real world — a wildfire, a flood, a landslide, an
eruption, a closure — you record it here. It shows on the affected trail, and a
**danger**-level advisory automatically removes the trail from trip planning
until you resolve it.

The file **`server/data/advisories.json`** is the single source of truth. It is
loaded into the site on every deploy, so entries survive restarts. Copy the
shape from `advisories.example.json`.

## The two ways to update

**Easiest — ask the agent.** Tell Claude, e.g. *"There's a fire on Semeru,
close it"* or *"The Lawu flood is over, resolve it."* It edits this file and
pushes; the live site updates in a few minutes.

**By hand.** Edit `advisories.json`, commit, and push to the
`claude/forest-guardian-website-XwOXh` branch. Render redeploys automatically.

## One advisory looks like this

```json
{
  "id": "semeru-fire-2026-08",
  "trail": "semeru",
  "type": "fire",
  "severity": "danger",
  "headline": "Wildfire near Kalimati — all routes closed",
  "detail": "Optional longer explanation shown under the headline.",
  "status": "active",
  "effectiveFrom": "2026-08-20",
  "effectiveUntil": null,
  "source": "TNBTS"
}
```

| Field | Notes |
|---|---|
| `id` | Any unique string. Convention: `slug-type-date`. |
| `trail` | The trail's slug (its URL name, e.g. `semeru`, `lawu`, `ijen`). |
| `type` | `fire`, `flood`, `landslide`, `volcanic`, `weather`, `earthquake`, `closure`, `other` |
| `severity` | `danger` (blocks planning), `warning` (shown, still plannable), `info` (a note) |
| `headline` | One line, shown in the alert. |
| `detail` | Optional paragraph. |
| `status` | `active` or `resolved`. Set to `resolved` instead of deleting — it keeps a record. |
| `effectiveFrom` / `effectiveUntil` | Optional `YYYY-MM-DD`. Outside this window the advisory is hidden automatically, so a flood warning can expire on its own. `null` means no bound. |
| `source` | Who reported it — a park office, ranger, news. Shown to build trust. |

## What each severity does

- **danger** — red alert on the trail, and the trail is dropped from the trip
  planner and its "Plan this hike" button is disabled. Use for fires, active
  eruptions, or any full closure.
- **warning** — amber alert; the trail stays plannable. Use for a flooded
  approach road, a damaged section, deteriorating weather.
- **info** — blue note for minor, non-blocking information.

## Volcanoes: the automatic feed

Volcano advisories can be driven from official **PVMBG alert levels** instead of
being written by hand. Set a level in `server/data/volcano-levels.json`:

```json
"levels": { "merapi": 3, "kelud": null }
```

`1` Normal · `2` Waspada · `3` Siaga · `4` Awas · `null` unknown.

The generator (`npm run sync:volcano`, and a daily GitHub Action) turns each
level into the right advisory automatically:

- **2 (Waspada)** → warning, trail stays plannable
- **3 (Siaga)** and **4 (Awas)** → danger, trail drops out of planning
- **1 or null** → no advisory (for the conditional volcanoes, their standing
  "check PVMBG" access notice keeps doing the job)

These auto entries have ids starting `auto-pvmbg-` and are rebuilt on every run,
so lowering a level removes its advisory by itself. Hand-written advisories are
never touched. Levels ship as `null` because a current level cannot be
fabricated — set the real number (or wire the MAGMA fetch, see the job file) to
activate one.

## Wildfires: the satellite feed

Wildfire advisories can be raised from active-fire satellite hotspots (NASA
FIRMS). Put hotspots in `server/data/wildfire-hotspots.json`; the generator
(`npm run sync:wildfire`, and the daily Action) raises a **warning** on any
trail with a recent, confident hotspot within 5 km.

Two deliberate choices:

- **Always a warning, never an auto-close.** A satellite hotspot is raw sensor
  data — it might be farmland burning or several km off. It informs ("verify
  before you go"); it never closes a trail on its own. A real closure is a
  hand-written `danger` advisory, or comes from the review agent.
- **Only trails with GPS coordinates can be matched** — currently Semeru,
  Bromo, and Ijen (3 of 50). Adding coordinates to more trails in
  `mountains.csv` widens the coverage.

Auto entries have ids starting `auto-fire-` and are rebuilt every run, so a
fire clearing removes its advisory. Like the volcano feed, hotspots ship empty
because they cannot be fabricated; wiring the FIRMS fetch (a free MAP_KEY) is
the remaining step, documented in the job file.

## The review agent (proposes; never publishes)

`.github/workflows/review-advisories.yml` runs Claude weekly to check for
real-world conditions (fire, flood, landslide, closures) affecting the trails
and **open a pull request** proposing advisory changes. It never edits the live
data directly — you merge the PR, or ignore it. On a safety dataset the agent
proposes and a person decides.

It is told to: only add conditions backed by a citable source, default to
`warning` and reserve `danger` for an official closure, never touch the
`auto-pvmbg-`/`auto-fire-` feed entries, and resolve (not delete) conditions
that are over. Every PR lists each change with its source so you can verify.

**One-time setup (only you can do it):**
1. Install the Claude GitHub App — https://github.com/apps/claude — on the repo.
2. Add a repo secret `ANTHROPIC_API_KEY` (Settings → Secrets and variables →
   Actions) from https://platform.claude.com.

Then run it from the Actions tab ("Advisory review agent" → Run workflow) to
test, or wait for the Monday schedule. Costs Claude API tokens per run.

**Unverified:** whether the Action's environment allows the web search the agent
needs to check live conditions. Check the first run's log — if WebSearch/WebFetch
are blocked, the agent can't see fresh news and this route is limited; fall back
to updating advisories by hand (or just ask the chat agent).

## Rules the site enforces

- An unknown `trail` slug is skipped (and logged), so a typo can't crash the
  site — but the advisory won't show. Check the slug against the trail's URL.
- A `resolved` advisory, or one outside its date window, is never shown to
  hikers.
- Malformed entries (bad `type`, bad date) stop the load with a clear error, so
  you find out immediately rather than shipping a broken file.
