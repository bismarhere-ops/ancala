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

## Rules the site enforces

- An unknown `trail` slug is skipped (and logged), so a typo can't crash the
  site — but the advisory won't show. Check the slug against the trail's URL.
- A `resolved` advisory, or one outside its date window, is never shown to
  hikers.
- Malformed entries (bad `type`, bad date) stop the load with a clear error, so
  you find out immediately rather than shipping a broken file.
