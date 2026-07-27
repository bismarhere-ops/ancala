'use strict';

/**
 * Imports server/data/mountains.csv into the trails, checkpoints and
 * mountain_profiles tables.
 *
 *   node server/import-mountains.js            # upsert (safe to re-run)
 *   node server/import-mountains.js --dry-run  # parse + report, write nothing
 *
 * Design rules:
 *  - "Unknown" / "N/A" in the source becomes NULL, never a guessed value.
 *  - Free-text ranges ("5-7", "~14") are kept verbatim in mountain_profiles
 *    and only reduced to a number for the trails columns that need one.
 *  - Re-running is idempotent: trails upsert on slug, checkpoints are
 *    rebuilt per trail.
 */

const fs = require('fs');
const path = require('path');
const { parseRecords } = require('./lib/csv');

// Required lazily so --dry-run can parse and validate without opening (and
// implicitly seeding) the database.
function getDb() {
  return require('./db').db;
}

const CSV_PATH = path.join(__dirname, 'data', 'mountains.csv');

// --- Value normalisation ---------------------------------------------------

/**
 * Source data uses "Unknown" and "N/A" as explicit absence markers, sometimes
 * with a trailing explanation ("Unknown — limited reporting"). All of those
 * become NULL; the explanation is metadata about the gap, not data.
 */
function clean(v) {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  if (s === '') return null;
  const lower = s.toLowerCase();
  if (lower === 'unknown' || lower === 'n/a') return null;
  if (/^unknown\s*[—\-–(]/.test(lower)) return null;
  if (/^n\/a\s*[—\-–(]/.test(lower)) return null;
  return s;
}

/** First number in a string. Handles "~14", "1200+", "2,400". */
function num(v) {
  const s = clean(v);
  if (s === null) return null;
  const m = s.replace(/,/g, '').match(/-?\d+(?:\.\d+)?/);
  return m ? parseFloat(m[0]) : null;
}

/** Midpoint of a leading range: "5-7" -> 6, "12-16 (2 days)" -> 14, "~3" -> 3. */
function rangeMid(v) {
  const s = clean(v);
  if (s === null) return null;
  // Only consider the part before any parenthetical or semicolon aside.
  const head = s.split(/[(;]/)[0].replace(/,/g, '');
  const m = head.match(/(\d+(?:\.\d+)?)\s*[-–]\s*(\d+(?:\.\d+)?)/);
  if (m) return (parseFloat(m[1]) + parseFloat(m[2])) / 2;
  const single = head.match(/\d+(?:\.\d+)?/);
  return single ? parseFloat(single[0]) : null;
}

/** Total elevation gain from strings like "...: ~2100m total". */
function totalGain(v) {
  const s = clean(v);
  if (s === null) return null;
  const m = s.match(/~?\s*(\d+(?:\.\d+)?)\s*m\s*total/i);
  if (m) return Math.round(parseFloat(m[1]));
  // Fall back to summing explicit "+NNNm" increments.
  const incs = [...s.matchAll(/\+\s*(\d+(?:\.\d+)?)\s*m/g)].map((x) => parseFloat(x[1]));
  if (incs.length) return Math.round(incs.reduce((a, b) => a + b, 0));
  return null;
}

// trails.difficulty is constrained to easy|moderate|hard|expert.
const DIFFICULTY_MAP = {
  beginner: 'easy',
  intermediate: 'moderate',
  advanced: 'hard',
  expert: 'expert',
};

function mapDifficulty(raw, closed) {
  if (closed) return 'expert';
  const s = clean(raw);
  if (s === null) return 'moderate';
  // "Beginner (rim only) / Intermediate (crater descent)" -> take the first.
  const first = s.toLowerCase().match(/beginner|intermediate|advanced|expert/);
  return first ? DIFFICULTY_MAP[first[0]] : 'moderate';
}

// trails.risk is constrained to low|medium|high. "Extreme" clamps to high.
function mapRisk(raw, closed) {
  if (closed) return 'high';
  const s = clean(raw);
  if (s === null) return 'medium';
  const lower = s.toLowerCase();
  if (lower.includes('extreme')) return 'high';
  if (lower.includes('high')) return 'high';
  if (lower.includes('low')) return 'low';
  return 'medium';
}

const CROWD_POPULARITY = { high: 90, medium: 60, low: 30 };
function mapPopularity(crowd) {
  const s = clean(crowd);
  if (s === null) return 0;
  const m = s.toLowerCase().match(/high|medium|low/);
  return m ? CROWD_POPULARITY[m[0]] : 0;
}

/**
 * Access status drives whether the platform lets a user plan a trip.
 *
 * Volcanoes whose access depends on the current alert level are "conditional"
 * — the UI must surface a PVMBG/BPPTKG status check before planning. The
 * source data phrases this inconsistently ("Conditional — ...", "closures
 * during elevated alert", "check PVMBG status"), so several fields are
 * scanned rather than relying on one prefix.
 */
const CONDITIONAL_RE = /conditional|closure|closed during|elevated alert|pvmbg|bpptkg/i;

function mapAccessStatus(row) {
  const basecamp = (row.basecamp_name || '').toLowerCase();
  const permit = (row.permit_required || '').toLowerCase();
  if (basecamp.includes('closed') || permit.includes('prohibited')) return 'closed';

  const scanned = [
    row.permit_required,
    row.registration_method,
    row.best_time_months,
    row.minimum_gear,
  ].join(' ');
  if (CONDITIONAL_RE.test(scanned)) return 'conditional';

  return 'open';
}

// --- Checkpoint extraction -------------------------------------------------

/**
 * Turns a pos_breakdown cell into ordered checkpoints with cumulative
 * distance and ETA.
 *
 * Input segments look like:
 *   "Ranu Pani>Watu Rejeng: ~3km/1.5h"
 *   "Pos 2>Summit: ~1km/45min"
 *   "Arcopodo>Summit: ~1.5km/2-3h"
 */
// "<path>: ~<km>km/<time><unit>" with optional trailing note, e.g.
// "Crater rim>Lake/blue fire: ~1km/30min (steep descent)".
const SEGMENT_RE =
  /^\s*([^:]+?)\s*:\s*~?\s*([\d.]+)\s*km\s*\/\s*([\d.]+(?:\s*[-–]\s*[\d.]+)?)\s*(h|hours?|min|minutes?)\b/i;

function parseSegments(posBreakdown) {
  const s = clean(posBreakdown);
  if (s === null) return [];

  const segments = [];
  for (const chunk of s.split(';')) {
    const m = chunk.match(SEGMENT_RE);
    if (!m) continue;
    const [, pathStr, kmStr, timeStr, unit] = m;

    // A path may chain more than two nodes ("A>B>C"); the distance/time given
    // covers the whole chain, so we keep only its endpoints.
    const nodes = pathStr.split('>').map((n) => n.trim()).filter(Boolean);
    if (nodes.length < 2) continue;

    let minutes = rangeMid(timeStr);
    if (minutes === null) continue;
    if (/^h/i.test(unit)) minutes *= 60;

    segments.push({
      from: nodes[0],
      to: nodes[nodes.length - 1],
      km: parseFloat(kmStr),
      minutes: Math.round(minutes),
    });
  }
  return segments;
}

function segmentsToCheckpoints(segments) {
  if (segments.length === 0) return [];

  const checkpoints = [{ name: segments[0].from, km: 0, etaMin: 0 }];
  let cumKm = 0;
  let cumMin = 0;

  for (const seg of segments) {
    cumKm += seg.km;
    cumMin += seg.minutes;
    checkpoints.push({
      name: seg.to,
      km: Math.round(cumKm * 100) / 100,
      etaMin: cumMin,
    });
  }
  return checkpoints;
}

// --- Import ----------------------------------------------------------------

const PROFILE_COLUMNS = [
  'access_status', 'elevation_m', 'nearest_city', 'basecamp_name', 'basecamp_access',
  'basecamp_lat', 'basecamp_lng', 'summit_lat', 'summit_lng',
  'distance_one_way_km', 'distance_round_trip_km', 'ascent_time_hours', 'descent_time_hours',
  'num_pos', 'pos_breakdown', 'elevation_gain_segments', 'trail_type',
  'difficulty_raw', 'risk_raw', 'key_hazards', 'critical_points',
  'distance_from_surabaya_km', 'travel_time_from_surabaya_hours', 'recommended_transport',
  'registration_method', 'permit_required', 'entry_fee_idr',
  'water_sources', 'camping_area', 'emergency_shelter', 'signal_coverage', 'toilet_warung',
  'environmental_condition', 'common_issues', 'reforestation_activity',
  'csr_potential', 'recommended_conservation',
  'best_time_months', 'sunrise_sunset_rating', 'unique_selling_point', 'crowd_level',
  'minimum_gear', 'water_requirement_liters', 'emergency_contact', 'common_accident_types',
  'offline_map_available', 'data_reliability', 'source_last_updated',
];

function buildTrail(row) {
  const closed = mapAccessStatus(row) === 'closed';

  const roundTrip = num(row.distance_round_trip_km);
  const oneWay = num(row.distance_one_way_km);
  const distanceKm = roundTrip ?? (oneWay !== null ? oneWay * 2 : 0);

  const ascentHours = rangeMid(row.ascent_time_hours);

  const tags = [];
  const trailType = clean(row.trail_type);
  if (trailType) {
    for (const t of trailType.split(';')) {
      const tag = t.split('(')[0].trim().toLowerCase();
      if (tag) tags.push(tag);
    }
  }
  const province = clean(row.province);
  if (province) tags.push(province.toLowerCase());

  const hazardsRaw = clean(row.key_hazards);
  const hazards = hazardsRaw
    ? hazardsRaw.split(';').map((h) => h.trim()).filter(Boolean)
    : [];

  return {
    slug: row.id,
    name: row.name,
    region: province || 'Indonesia',
    summary: clean(row.unique_selling_point) || `${row.name}, ${province || 'Indonesia'}.`,
    distanceKm,
    elevationGainM: totalGain(row.elevation_gain_segments) ?? 0,
    estimatedMinutes: ascentHours !== null ? Math.round(ascentHours * 60) : 0,
    difficulty: mapDifficulty(row.difficulty, closed),
    risk: mapRisk(row.risk_level, closed),
    popularity: mapPopularity(row.crowd_level),
    lat: num(row.basecamp_gps_lat),
    lng: num(row.basecamp_gps_lng),
    tags: JSON.stringify(tags),
    hazards: JSON.stringify(hazards),
  };
}

function buildProfile(row) {
  return {
    access_status: mapAccessStatus(row),
    elevation_m: num(row.elevation_m),
    nearest_city: clean(row.nearest_city),
    basecamp_name: clean(row.basecamp_name),
    basecamp_access: clean(row.basecamp_access),
    basecamp_lat: num(row.basecamp_gps_lat),
    basecamp_lng: num(row.basecamp_gps_lng),
    summit_lat: num(row.summit_gps_lat),
    summit_lng: num(row.summit_gps_lng),
    distance_one_way_km: clean(row.distance_one_way_km),
    distance_round_trip_km: clean(row.distance_round_trip_km),
    ascent_time_hours: clean(row.ascent_time_hours),
    descent_time_hours: clean(row.descent_time_hours),
    num_pos: clean(row.num_pos),
    pos_breakdown: clean(row.pos_breakdown),
    elevation_gain_segments: clean(row.elevation_gain_segments),
    trail_type: clean(row.trail_type),
    difficulty_raw: clean(row.difficulty),
    risk_raw: clean(row.risk_level),
    key_hazards: clean(row.key_hazards),
    critical_points: clean(row.critical_points),
    distance_from_surabaya_km: clean(row.distance_from_surabaya_km),
    travel_time_from_surabaya_hours: clean(row.travel_time_from_surabaya_hours),
    recommended_transport: clean(row.recommended_transport),
    registration_method: clean(row.registration_method),
    permit_required: clean(row.permit_required),
    entry_fee_idr: clean(row.entry_fee_idr),
    water_sources: clean(row.water_sources),
    camping_area: clean(row.camping_area),
    emergency_shelter: clean(row.emergency_shelter),
    signal_coverage: clean(row.signal_coverage),
    toilet_warung: clean(row.toilet_warung),
    environmental_condition: clean(row.environmental_condition),
    common_issues: clean(row.common_issues),
    reforestation_activity: clean(row.reforestation_activity),
    csr_potential: clean(row.csr_potential),
    recommended_conservation: clean(row.recommended_conservation),
    best_time_months: clean(row.best_time_months),
    sunrise_sunset_rating: num(row.sunrise_sunset_rating),
    unique_selling_point: clean(row.unique_selling_point),
    crowd_level: clean(row.crowd_level),
    minimum_gear: clean(row.minimum_gear),
    water_requirement_liters: clean(row.water_requirement_liters),
    emergency_contact: clean(row.emergency_contact),
    common_accident_types: clean(row.common_accident_types),
    offline_map_available: clean(row.offline_map_available),
    data_reliability: clean(row.data_reliability),
    source_last_updated: clean(row.last_updated),
  };
}

function importMountains({ dryRun = false, csvPath = CSV_PATH } = {}) {
  const rows = parseRecords(fs.readFileSync(csvPath, 'utf-8'));

  const prepared = rows.map((row) => ({
    trail: buildTrail(row),
    profile: buildProfile(row),
    checkpoints: segmentsToCheckpoints(parseSegments(row.pos_breakdown)),
  }));

  const stats = {
    rows: prepared.length,
    checkpoints: prepared.reduce((n, p) => n + p.checkpoints.length, 0),
    withoutCheckpoints: prepared.filter((p) => p.checkpoints.length === 0).map((p) => p.trail.slug),
    withoutCoords: prepared.filter((p) => p.trail.lat === null).length,
    withoutGain: prepared.filter((p) => p.trail.elevationGainM === 0).length,
    byStatus: {},
    byReliability: {},
  };
  for (const p of prepared) {
    const s = p.profile.access_status;
    const r = p.profile.data_reliability || 'Unknown';
    stats.byStatus[s] = (stats.byStatus[s] || 0) + 1;
    stats.byReliability[r] = (stats.byReliability[r] || 0) + 1;
  }

  if (dryRun) return { ...stats, written: false };

  const db = getDb();

  const insertTrail = db.prepare(`
    INSERT INTO trails (slug, name, region, summary, distance_km, elevation_gain_m,
                        estimated_min, difficulty, risk, popularity, lat, lng, tags, hazards)
    VALUES (@slug, @name, @region, @summary, @distanceKm, @elevationGainM,
            @estimatedMinutes, @difficulty, @risk, @popularity, @lat, @lng, @tags, @hazards)
    ON CONFLICT(slug) DO UPDATE SET
      name=excluded.name, region=excluded.region, summary=excluded.summary,
      distance_km=excluded.distance_km, elevation_gain_m=excluded.elevation_gain_m,
      estimated_min=excluded.estimated_min, difficulty=excluded.difficulty,
      risk=excluded.risk, popularity=excluded.popularity,
      lat=excluded.lat, lng=excluded.lng, tags=excluded.tags, hazards=excluded.hazards,
      updated_at=datetime('now')
    RETURNING id
  `);

  const clearCheckpoints = db.prepare('DELETE FROM checkpoints WHERE trail_id = ?');
  const insertCheckpoint = db.prepare(`
    INSERT INTO checkpoints (trail_id, position, name, km, elevation_m, eta_min, notes)
    VALUES (?, ?, ?, ?, NULL, ?, NULL)
  `);

  const cols = ['trail_id', ...PROFILE_COLUMNS];
  const insertProfile = db.prepare(`
    INSERT INTO mountain_profiles (${cols.join(', ')})
    VALUES (${cols.map((c) => `@${c}`).join(', ')})
    ON CONFLICT(trail_id) DO UPDATE SET
      ${PROFILE_COLUMNS.map((c) => `${c}=excluded.${c}`).join(',\n      ')},
      imported_at=datetime('now')
  `);

  const tx = db.transaction((items) => {
    for (const { trail, profile, checkpoints } of items) {
      const { id: trailId } = insertTrail.get(trail);

      clearCheckpoints.run(trailId);
      checkpoints.forEach((c, i) => {
        insertCheckpoint.run(trailId, i, c.name, c.km, c.etaMin);
      });

      insertProfile.run({ trail_id: trailId, ...profile });
    }
  });
  tx(prepared);

  return { ...stats, written: true };
}

// --- CLI -------------------------------------------------------------------

if (require.main === module) {
  const dryRun = process.argv.includes('--dry-run');
  const res = importMountains({ dryRun });

  /* eslint-disable no-console */
  console.log(`\n${dryRun ? 'DRY RUN — nothing written' : 'Imported'}`);
  console.log(`  mountains:        ${res.rows}`);
  console.log(`  checkpoints:      ${res.checkpoints}`);
  console.log(`  access status:    ${JSON.stringify(res.byStatus)}`);
  console.log(`  reliability:      ${JSON.stringify(res.byReliability)}`);
  console.log('\nGaps carried through from the source data:');
  console.log(`  no basecamp GPS:  ${res.withoutCoords}/${res.rows}`);
  console.log(`  no elevation gain:${res.withoutGain}/${res.rows} (stored as 0)`);
  console.log(`  no checkpoints:   ${res.withoutCheckpoints.length}/${res.rows}`);
  if (res.withoutCheckpoints.length) {
    console.log(`    ${res.withoutCheckpoints.join(', ')}`);
  }
  console.log('');
  /* eslint-enable no-console */
}

module.exports = {
  importMountains,
  // exported for tests
  clean, num, rangeMid, totalGain, parseSegments, segmentsToCheckpoints, mapAccessStatus,
};
