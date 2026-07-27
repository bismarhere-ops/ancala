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

## Integration notes

- `id` is designed to match the `slug` field in `seed-trails.json` conventions.
- `pos_breakdown` and `elevation_gain_segments` are semicolon-delimited and can be split into checkpoint records.
- Volcanic mountains (Merapi, Kelud, Slamet, Agung, Sinabung, Guntur) carry conditional access — the platform should surface a PVMBG/BPPTKG status check before allowing trip planning.
- Sinabung is recorded as **closed to hikers** (active eruption cycle, exclusion zone enforced). It is retained in the dataset as an observation-only and CSR-relevant entry, not a hikeable trail.

## Known gaps

Priority for field verification:
1. GPS coordinates — only 4 mountains have verified basecamp/summit coordinates.
2. Entry fees — many marked `Unknown` or estimated; needs per-basecamp survey.
3. Emergency contacts — most rows list only the regional BASARNAS, not a basecamp-level number.
4. Low-reliability East Java rows (Kawi, Anjasmoro, Liman, Lemongan, Ranti, Merapi/Ijen complex) need on-the-ground trail survey before use in safety-critical features.
