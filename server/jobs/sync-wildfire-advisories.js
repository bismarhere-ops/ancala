'use strict';

/**
 * Raises wildfire advisories from active-fire satellite hotspots.
 *
 *   node server/jobs/sync-wildfire-advisories.js            # write changes
 *   node server/jobs/sync-wildfire-advisories.js --dry-run  # report only
 *
 * A trail gets a wildfire advisory when one or more recent, sufficiently
 * confident hotspots fall within RADIUS_KM of its coordinates. The severity is
 * always WARNING, never danger:
 *
 *   A satellite hotspot is raw sensor data — it may be farmland burning, or
 *   kilometres off the trail. It is NOT an authority's closure decision, so it
 *   must inform ("verify before you go"), not auto-close a trail. Danger
 *   closures for fire stay human- or authority-driven (a manual advisory, or
 *   the review agent).
 *
 * This job OWNS only advisories whose id begins with "auto-fire-"; hand-written
 * advisories and the volcano feed's "auto-pvmbg-" entries are never touched.
 * Each run fully rebuilds the auto-fire set, so a fire clearing removes its
 * advisory automatically.
 *
 * Two things gate live operation, both documented and both left as safe no-ops:
 *   1. Coordinates — only trails with GPS in mountains.csv can be matched.
 *      Currently 3 of 50 (Semeru, Bromo, Ijen).
 *   2. The FIRMS fetch that would fill wildfire-hotspots.json is NOT wired: its
 *      endpoint could not be verified from the build environment and it needs a
 *      free NASA FIRMS MAP_KEY. See fetchHotspots() note at the bottom.
 */

const fs = require('fs');
const path = require('path');
const { parseRecords } = require('../lib/csv');
const { validate } = require('../lib/advisories');

const ROOT = path.resolve(__dirname, '..', '..');
const HOTSPOTS_PATH = path.join(ROOT, 'server', 'data', 'wildfire-hotspots.json');
const ADVISORIES_PATH = path.join(ROOT, 'server', 'data', 'advisories.json');
const MOUNTAINS_CSV = path.join(ROOT, 'server', 'data', 'mountains.csv');

const AUTO_PREFIX = 'auto-fire-';
const SOURCE = 'NASA FIRMS (auto)';
const RADIUS_KM = 5; // a hotspot within this distance raises the advisory
const WINDOW_DAYS = 3; // ignore hotspots older than this
const EARTH_KM = 6371;

/** Great-circle distance between two lat/lng points, in kilometres. */
function haversineKm(aLat, aLng, bLat, bLng) {
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_KM * Math.asin(Math.min(1, Math.sqrt(s)));
}

/** FIRMS confidence is 'l'|'n'|'h' or a 0-100 number → rank 1..3. */
function confidenceRank(c) {
  if (c == null || c === '') return 2; // treat unknown as nominal
  if (typeof c === 'number') return c < 30 ? 1 : c < 80 ? 2 : 3;
  const s = String(c).trim().toLowerCase();
  if (s === 'l' || s === 'low') return 1;
  if (s === 'h' || s === 'high') return 3;
  if (/^\d+$/.test(s)) return confidenceRank(Number(s));
  return 2;
}

/** Parses a lat/lng number, or null. */
function coord(v) {
  if (v == null || v === '' || /unknown/i.test(String(v))) return null;
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : null;
}

/** Map of slug -> {lat, lng} for trails that have coordinates (summit, else basecamp). */
function trailCoords(csvPath = MOUNTAINS_CSV) {
  const rows = parseRecords(fs.readFileSync(csvPath, 'utf-8'));
  const map = new Map();
  for (const r of rows) {
    const lat = coord(r.summit_gps_lat) ?? coord(r.basecamp_gps_lat);
    const lng = coord(r.summit_gps_lng) ?? coord(r.basecamp_gps_lng);
    if (lat != null && lng != null) map.set(r.id, { lat, lng });
  }
  return map;
}

/**
 * For each trail with coordinates, finds qualifying hotspots (recent enough and
 * confident enough) within RADIUS_KM. Returns Map slug -> summary. Pure.
 */
function matchHotspots(coords, hotspots, { radiusKm = RADIUS_KM, windowDays = WINDOW_DAYS, minRank = 2, now = new Date() } = {}) {
  const cutoff = new Date(now.getTime() - windowDays * 86400000).toISOString().slice(0, 10);
  const matches = new Map();

  for (const h of hotspots) {
    const lat = coord(h.latitude);
    const lng = coord(h.longitude);
    if (lat == null || lng == null) continue;
    if (h.acq_date && h.acq_date < cutoff) continue;
    if (confidenceRank(h.confidence) < minRank) continue;

    for (const [slug, c] of coords) {
      const km = haversineKm(c.lat, c.lng, lat, lng);
      if (km > radiusKm) continue;
      const cur = matches.get(slug) || { count: 0, nearestKm: Infinity };
      cur.count += 1;
      cur.nearestKm = Math.min(cur.nearestKm, km);
      matches.set(slug, cur);
    }
  }
  return matches;
}

function buildAdvisory(slug, match, radiusKm, windowDays) {
  const nearest = Math.round(match.nearestKm * 10) / 10;
  const advisory = {
    id: `${AUTO_PREFIX}${slug}`,
    trail: slug,
    type: 'fire',
    severity: 'warning', // satellite detection informs; it does not close a trail
    headline: `Active fire detected within ${radiusKm} km (satellite)`,
    detail:
      `Satellites detected ${match.count} active-fire hotspot(s) within ${radiusKm} km ` +
      `(nearest ~${nearest} km) in the last ${windowDays} days. This is raw satellite ` +
      `detection, not an official closure — check with the basecamp before you go.`,
    status: 'active',
    effectiveFrom: null,
    effectiveUntil: null,
    source: SOURCE,
  };
  validate(advisory, 0);
  return advisory;
}

/** Rebuilds the auto-fire advisories and merges with everything else. Pure. */
function rebuild(existing, matches, { radiusKm = RADIUS_KM, windowDays = WINDOW_DAYS } = {}) {
  const others = existing.filter((a) => !a.id.startsWith(AUTO_PREFIX));
  const auto = [];
  for (const [slug, match] of matches) auto.push(buildAdvisory(slug, match, radiusKm, windowDays));
  return { next: [...others, ...auto], autoCount: auto.length };
}

function generate({
  hotspotsPath = HOTSPOTS_PATH,
  advisoriesPath = ADVISORIES_PATH,
  csvPath = MOUNTAINS_CSV,
  radiusKm = RADIUS_KM,
  windowDays = WINDOW_DAYS,
  now,
  dryRun = false,
} = {}) {
  const hotspots = JSON.parse(fs.readFileSync(hotspotsPath, 'utf-8')).hotspots || [];
  const existing = JSON.parse(fs.readFileSync(advisoriesPath, 'utf-8'));
  const coords = trailCoords(csvPath);

  const matches = matchHotspots(coords, hotspots, { radiusKm, windowDays, now });
  const { next, autoCount } = rebuild(existing, matches, { radiusKm, windowDays });

  const changed = JSON.stringify(existing) !== JSON.stringify(next);
  if (changed && !dryRun) {
    fs.writeFileSync(advisoriesPath, `${JSON.stringify(next, null, 2)}\n`);
  }

  return { changed, autoCount, trailsWithCoords: coords.size, next };
}

module.exports = {
  haversineKm,
  confidenceRank,
  trailCoords,
  matchHotspots,
  rebuild,
  generate,
  AUTO_PREFIX,
};

if (require.main === module) {
  const dryRun = process.argv.includes('--dry-run');
  const res = generate({ dryRun });
  /* eslint-disable no-console */
  console.log(`Wildfire advisories: ${res.autoCount} active (of ${res.trailsWithCoords} trails with coordinates)`);
  console.log(res.changed ? (dryRun ? '  would update advisories.json' : '  advisories.json updated') : '  no change');
  /* eslint-enable no-console */
}

// FULLY AUTOMATIC FETCH (not shipped): to fill wildfire-hotspots.json on a
// schedule, call NASA FIRMS area CSV with a free MAP_KEY
// (https://firms.modaps.eosdis.nasa.gov/api/), e.g. the VIIRS_SNPP_NRT product
// bounded to Indonesia, and map rows to {latitude, longitude, confidence,
// acq_date}. Left unimplemented: the endpoint could not be verified from the
// build environment and shipping an untested fetch into a safety dataset would
// be irresponsible.
