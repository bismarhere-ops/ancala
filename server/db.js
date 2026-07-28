'use strict';

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const config = require('./config');

// Ensure data directory exists before opening the DB file.
fs.mkdirSync(path.dirname(config.db.path), { recursive: true });

const db = new Database(config.db.path);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// --- Schema ---------------------------------------------------------------
const SCHEMA = `
CREATE TABLE IF NOT EXISTS trails (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  slug            TEXT NOT NULL UNIQUE,
  name            TEXT NOT NULL,
  region          TEXT NOT NULL,
  summary         TEXT NOT NULL,
  distance_km     REAL NOT NULL,
  elevation_gain_m INTEGER NOT NULL,
  estimated_min   INTEGER NOT NULL,
  difficulty      TEXT NOT NULL CHECK (difficulty IN ('easy','moderate','hard','expert')),
  risk            TEXT NOT NULL CHECK (risk IN ('low','medium','high')),
  popularity      INTEGER NOT NULL DEFAULT 0,
  lat             REAL,
  lng             REAL,
  tags            TEXT,             -- JSON array
  hazards         TEXT,             -- JSON array
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_trails_difficulty ON trails(difficulty);
CREATE INDEX IF NOT EXISTS idx_trails_region     ON trails(region);

CREATE TABLE IF NOT EXISTS checkpoints (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  trail_id      INTEGER NOT NULL REFERENCES trails(id) ON DELETE CASCADE,
  position      INTEGER NOT NULL,
  name          TEXT NOT NULL,
  km            REAL NOT NULL,
  elevation_m   INTEGER,
  eta_min       INTEGER,
  notes         TEXT
);
CREATE INDEX IF NOT EXISTS idx_checkpoints_trail ON checkpoints(trail_id, position);

CREATE TABLE IF NOT EXISTS reports (
  id            TEXT PRIMARY KEY,
  trail_id      INTEGER REFERENCES trails(id) ON DELETE SET NULL,
  type          TEXT NOT NULL,
  description   TEXT,
  severity      TEXT CHECK (severity IN ('low','medium','high')) DEFAULT 'medium',
  status        TEXT CHECK (status IN ('new','ack','resolved')) DEFAULT 'new',
  lat           REAL,
  lng           REAL,
  reporter_name TEXT,
  reporter_email TEXT,
  anonymous     INTEGER NOT NULL DEFAULT 0,
  photos        TEXT,              -- JSON array of URLs
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_reports_created ON reports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reports_trail   ON reports(trail_id);

CREATE TABLE IF NOT EXISTS volunteers (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  email       TEXT NOT NULL,
  phone       TEXT,
  region      TEXT,
  interests   TEXT,                -- JSON array
  status      TEXT CHECK (status IN ('pending','confirmed','active','paused')) DEFAULT 'pending',
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_volunteers_email ON volunteers(email);

CREATE TABLE IF NOT EXISTS impact_metrics (
  key         TEXT PRIMARY KEY,
  value       INTEGER NOT NULL,
  label       TEXT NOT NULL,
  unit        TEXT,
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Extended profile for trails sourced from the mountains dataset. Holds the
-- fields that don't fit the generic trails shape: logistics, conservation,
-- and safety data. NULL means "Unknown" in the source data — never guessed.
CREATE TABLE IF NOT EXISTS mountain_profiles (
  trail_id                        INTEGER PRIMARY KEY REFERENCES trails(id) ON DELETE CASCADE,
  access_status                   TEXT NOT NULL DEFAULT 'open' CHECK (access_status IN ('open','conditional','closed')),
  elevation_m                     INTEGER,
  nearest_city                    TEXT,
  basecamp_name                   TEXT,
  basecamp_access                 TEXT,
  basecamp_lat                    REAL,
  basecamp_lng                    REAL,
  summit_lat                      REAL,
  summit_lng                      REAL,
  distance_one_way_km             TEXT,
  distance_round_trip_km          TEXT,
  ascent_time_hours               TEXT,
  descent_time_hours              TEXT,
  num_pos                         TEXT,
  pos_breakdown                   TEXT,
  elevation_gain_segments         TEXT,
  trail_type                      TEXT,
  difficulty_raw                  TEXT,
  risk_raw                        TEXT,
  key_hazards                     TEXT,
  critical_points                 TEXT,
  distance_from_surabaya_km       TEXT,
  travel_time_from_surabaya_hours TEXT,
  recommended_transport           TEXT,
  registration_method             TEXT,
  permit_required                 TEXT,
  entry_fee_idr                   TEXT,
  water_sources                   TEXT,
  camping_area                    TEXT,
  emergency_shelter               TEXT,
  signal_coverage                 TEXT,
  toilet_warung                   TEXT,
  environmental_condition         TEXT,
  common_issues                   TEXT,
  reforestation_activity          TEXT,
  csr_potential                   TEXT,
  recommended_conservation        TEXT,
  best_time_months                TEXT,
  sunrise_sunset_rating           INTEGER,
  unique_selling_point            TEXT,
  crowd_level                     TEXT,
  minimum_gear                    TEXT,
  water_requirement_liters        TEXT,
  emergency_contact               TEXT,
  common_accident_types           TEXT,
  offline_map_available           TEXT,
  data_reliability                TEXT,
  source_last_updated             TEXT,
  imported_at                     TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_profiles_csr         ON mountain_profiles(csr_potential);
CREATE INDEX IF NOT EXISTS idx_profiles_reliability ON mountain_profiles(data_reliability);
CREATE INDEX IF NOT EXISTS idx_profiles_status      ON mountain_profiles(access_status);
`;

db.exec(SCHEMA);

// --- Migrations -----------------------------------------------------------
// Lightweight additive migrations for databases created before a column
// existed. SQLite cannot drop/alter columns easily, so we only ever add.
function addColumnIfMissing(table, column, definition) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all();
  if (cols.some((c) => c.name === column)) return;
  db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
}

addColumnIfMissing('impact_metrics', 'target', 'INTEGER');
addColumnIfMissing('impact_metrics', 'kind', "TEXT NOT NULL DEFAULT 'reported'");

// --- Seeding --------------------------------------------------------------

/**
 * Slugs from the original fictional demo dataset. They were seeded before the
 * real Indonesian mountain data existed and are removed on boot so invented
 * trails ("Pine Ridge Summit") can never appear alongside real ones.
 */
const LEGACY_DEMO_SLUGS = [
  'pine-ridge-summit',
  'hawk-valley-loop',
  'silverwood-traverse',
  'mossy-creek-falls',
  'cedar-ridge-overnight',
  'larchfield-meadow',
];

function pruneLegacyDemoTrails() {
  const del = db.prepare('DELETE FROM trails WHERE slug = ?');
  const tx = db.transaction((slugs) => slugs.reduce((n, s) => n + del.run(s).changes, 0));
  return tx(LEGACY_DEMO_SLUGS);
}

/**
 * Impact metrics.
 *
 * `measured` metrics are recomputed from the database on every seed — they are
 * facts about this system. `reported` metrics have no data source yet, so they
 * carry value 0 and a target; the UI must present them as goals not
 * achievements. Publishing invented numbers on a CSR platform is the fastest
 * way to lose a sponsor's trust.
 */
function measuredMetrics() {
  const mountains = db.prepare('SELECT COUNT(*) AS n FROM mountain_profiles').get().n;
  const volunteers = db
    .prepare("SELECT COUNT(*) AS n FROM volunteers WHERE status IN ('active','confirmed','pending')")
    .get().n;
  const reports = db.prepare('SELECT COUNT(*) AS n FROM reports').get().n;

  return [
    { key: 'mountains_mapped', value: mountains, target: 100, label: 'Mountains mapped', unit: 'mountains', kind: 'measured' },
    { key: 'active_guardians', value: volunteers, target: 2000, label: 'Registered guardians', unit: 'people', kind: 'measured' },
    { key: 'field_reports', value: reports, target: 500, label: 'Field reports filed', unit: 'reports', kind: 'measured' },
  ];
}

const REPORTED_METRICS = [
  { key: 'trees_planted', value: 0, target: 60000, label: 'Trees planted', unit: 'trees', kind: 'reported' },
  { key: 'waste_collected', value: 0, target: 18000, label: 'Waste collected', unit: 'kg', kind: 'reported' },
  { key: 'bootcamp_graduates', value: 0, target: 650, label: 'Bootcamp graduates', unit: 'people', kind: 'reported' },
  { key: 'partner_ngos', value: 0, target: 60, label: 'Partner NGOs', unit: 'orgs', kind: 'reported' },
];

function syncMetrics() {
  const upsert = db.prepare(`
    INSERT INTO impact_metrics (key, value, target, label, unit, kind)
    VALUES (@key, @value, @target, @label, @unit, @kind)
    ON CONFLICT(key) DO UPDATE SET
      value=excluded.value, target=excluded.target, label=excluded.label,
      unit=excluded.unit, kind=excluded.kind, updated_at=datetime('now')
  `);
  // Keys that existed only in the old fabricated seed.
  const dropStale = db.prepare('DELETE FROM impact_metrics WHERE key = ?');

  const items = [...measuredMetrics(), ...REPORTED_METRICS];
  const tx = db.transaction(() => {
    ['trails_protected'].forEach((k) => dropStale.run(k));
    items.forEach((m) => upsert.run(m));
  });
  tx();
  return items.length;
}

/**
 * Seeds trail data from the real mountains dataset. `import-mountains` is
 * required lazily to avoid a circular dependency at module load.
 */
function seed({ force = false } = {}) {
  pruneLegacyDemoTrails();

  const trailCount = db.prepare('SELECT COUNT(*) AS n FROM trails').get().n;
  if (trailCount > 0 && !force) {
    syncMetrics();
    return { seeded: false, trails: trailCount };
  }

  const { importMountains } = require('./import-mountains');
  const res = importMountains();
  const metrics = syncMetrics();

  return { seeded: true, trails: res.rows, checkpoints: res.checkpoints, metrics };
}

function reset() {
  db.exec(`
    DROP TABLE IF EXISTS mountain_profiles;
    DROP TABLE IF EXISTS checkpoints;
    DROP TABLE IF EXISTS reports;
    DROP TABLE IF EXISTS volunteers;
    DROP TABLE IF EXISTS impact_metrics;
    DROP TABLE IF EXISTS trails;
  `);
  db.exec(SCHEMA);
  addColumnIfMissing('impact_metrics', 'target', 'INTEGER');
  addColumnIfMissing('impact_metrics', 'kind', "TEXT NOT NULL DEFAULT 'reported'");
}

// Exported before the boot seed runs so the lazy require inside
// import-mountains resolves against a fully-populated module.
module.exports = { db, seed, reset, syncMetrics, LEGACY_DEMO_SLUGS };

// Always seed on boot if the DB is empty (idempotent).
seed();

// CLI helpers: `node server/db.js --seed` / `--reset`
if (require.main === module) {
  const arg = process.argv[2];
  if (arg === '--reset') {
    reset();
    const res = seed({ force: true });
    // eslint-disable-next-line no-console
    console.log('DB reset + seeded:', res);
  } else if (arg === '--seed') {
    const res = seed({ force: true });
    // eslint-disable-next-line no-console
    console.log('DB seeded:', res);
  } else {
    // eslint-disable-next-line no-console
    console.log('Usage: node server/db.js [--seed | --reset]');
  }
}
