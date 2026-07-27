# Mountains Dataset — `mountains.csv`

50 Indonesian hiking mountains structured for hiker safety decisions, CSR targeting, and platform integration.

**Coverage:** East Java 20 · Central Java 10 · West Java 8 · Bali & Nusa Tenggara 5 · Sumatra 4 · Sulawesi 3
**Shape:** 50 rows × 50 columns

## Data rules applied

- Unverifiable values are `Unknown` — never guessed. 417 of 2500 cells are `Unknown`, concentrated in low-traffic peaks with no reliable published trail data.
- Units are consistent: distance `km`, elevation `m`, time `hours`, fees `IDR`.
- Ranges (`"5-7"`) are used where real-world variance is genuine, not as a hedge for missing data.
- `data_reliability` grades each row: **High** (13) = national-park-managed with published figures; **Medium** (18) = well-documented by hiking community, figures approximate; **Low** (18) = sparse documentation, verify locally before relying on it.

## Column reference

### Basic
| Column | Notes |
|---|---|
| `id` | Stable slug key for platform integration |
| `name`, `province`, `nearest_city` | |
| `elevation_m` | Summit elevation, meters ASL |
| `basecamp_name`, `basecamp_access` | Multiple basecamps listed where routes differ materially |
| `basecamp_gps_lat/lng`, `summit_gps_lat/lng` | Populated only where coordinates are verified; otherwise `Unknown` |

### Trail & route
`distance_one_way_km`, `distance_round_trip_km`, `ascent_time_hours`, `descent_time_hours`, `num_pos`, `pos_breakdown`, `elevation_gain_segments`, `trail_type`

`pos_breakdown` is the operationally important field — segment-by-segment distance and time, formatted as `Origin>Destination: ~Xkm/Yh; ...`. Parseable for timeline generation in the hiker dashboard.

### Difficulty & risk
`difficulty` (Beginner/Intermediate/Advanced) · `risk_level` (Low/Medium/High/Extreme) · `key_hazards` · `critical_points`

`critical_points` names the specific dangerous section, not a general warning. Use this for in-app hazard markers.

### Logistics
`distance_from_surabaya_km`, `travel_time_from_surabaya_hours`, `recommended_transport`, `registration_method`, `permit_required`, `entry_fee_idr`

Fees are 2024 estimates and drift. Treat as indicative, re-verify per season.

### Facilities
`water_sources`, `camping_area`, `emergency_shelter`, `signal_coverage`, `toilet_warung`

`signal_coverage` names the carrier where known — this drives the offline-guide download prompt.

### Conservation (Forest Guardian core)
`environmental_condition`, `common_issues`, `reforestation_activity`, `csr_potential`, `recommended_conservation`

`recommended_conservation` is intentionally specific per mountain (e.g. Ijen: gas mask distribution for sulfur miners; Merbabu: savanna fire rapid response; Prau: portable toilet initiative). These are the CSR program hooks.

### Experience
`best_time_months`, `sunrise_sunset_rating` (1–5), `unique_selling_point`, `crowd_level`

### Safety
`minimum_gear`, `water_requirement_liters`, `emergency_contact`, `common_accident_types`

### Digital
`offline_map_available`, `data_reliability`, `last_updated`

## Importing into the database

```bash
npm run seed:mountains:dry   # parse + report, writes nothing (no DB needed)
npm run seed:mountains       # upsert into the database
```

`server/import-mountains.js` writes to three tables:

| Table | What it gets |
|---|---|
| `trails` | Core shape — slug, name, region, distance, difficulty, risk, popularity, coords |
| `checkpoints` | Parsed from `pos_breakdown`, with cumulative km and ETA |
| `mountain_profiles` | The remaining 48 columns, 1:1 with the CSV |

The import is idempotent — `trails` upserts on `slug`, checkpoints are rebuilt per trail, and profiles upsert on `trail_id`. It coexists with the original `seed-trails.json` demo data rather than replacing it.

### Transformations applied

- **`Unknown` / `N/A` become `NULL`**, including when followed by an explanation (`"Unknown — limited reporting"`). Nothing is guessed to fill a required column.
- **Difficulty** maps to the `trails` constraint: Beginner→`easy`, Intermediate→`moderate`, Advanced→`hard`. Where the source gives two (`"Beginner (rim only) / Intermediate (crater descent)"`) the first is used. The raw value is preserved in `mountain_profiles.difficulty_raw`.
- **Risk** clamps `Extreme`→`high`, since `trails.risk` only allows low/medium/high. Raw value preserved in `risk_raw`.
- **Ranges** (`"5-7"`, `"12-16 (2 days recommended)"`) reduce to their midpoint for `estimated_min` only. The verbatim string stays in `mountain_profiles`.
- **`access_status`** is derived, not a CSV column. `closed` for Sinabung; `conditional` for the five volcanoes whose access depends on alert level (Merapi, Kelud, Slamet, Guntur, Agung). The platform should gate trip planning on this and surface a PVMBG/BPPTKG status check.

### Known lossy conversions

- `elevation_gain_m` is stored as **0 for 21 mountains** where the source has no gain figure. Read `mountain_profiles.elevation_gain_segments` (NULL when genuinely unknown) rather than trusting a 0.
- **20 mountains produce no checkpoints** because `pos_breakdown` is `Unknown`. They import fine but can't drive a dashboard timeline.
- Multi-node segments (`"A>B>C: ~3km/2-3h"`, Pangrango only) keep endpoints and drop the middle node, since the distance covers the whole chain.

## Known gaps

Priority for field verification:
1. **GPS coordinates — only 3 of 50** (Semeru, Bromo, Ijen) have verified basecamp and summit coordinates. This is the largest gap and the one that needs field capture rather than desk research.
2. **Entry fees** — 27 of 50 are `Unknown`; the rest are 2024 estimates that drift each season.
3. **Emergency contacts** — 14 of 50 are `Unknown`, and most of the rest name only the regional BASARNAS rather than a basecamp-level number. Weakest field for a safety platform.
4. **18 rows are graded `Low` reliability.** Gate safety-critical features on `data_reliability != 'Low'` rather than treating all 50 equally. The East Java low-confidence set (Kawi, Anjasmoro, Liman, Lemongan, Ranti, Merapi/Ijen complex) needs on-the-ground survey.
