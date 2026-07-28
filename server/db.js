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
  data_reliability_tier           TEXT CHECK (data_reliability_tier IN ('high','medium','low')),
  source_last_updated             TEXT,
  imported_at                     TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_profiles_status      ON mountain_profiles(access_status);
CREATE INDEX IF NOT EXISTS idx_profiles_reliability ON mountain_profiles(data_reliability_tier);
`;

db.exec(SCHEMA);

// --- Migrations -----------------------------------------------------------
// SQLite cannot easily drop or alter columns, so migrations are additive and
// keyed off user_version. Bump SCHEMA_VERSION and add a numbered step.
const SCHEMA_VERSION = 1;

const MIGRATIONS = [
  // 1 — the fictional demo trails predate the real mountains dataset. They were
  //     served alongside real ones with difficulty and risk ratings, so they are
  //     removed once rather than on every boot.
  () => {
    db.exec(`
      DROP TABLE IF EXISTS impact_metrics;
      DELETE FROM trails WHERE slug IN (
        'pine-ridge-summit', 'hawk-valley-loop', 'silverwood-traverse',
        'mossy-creek-falls', 'cedar-ridge-overnight', 'larchfield-meadow'
      );
    `);
  },
];

function migrate() {
  const current = db.pragma('user_version', { simple: true });
  if (current >= SCHEMA_VERSION) return 0;

  const applied = db.transaction(() => {
    for (let v = current; v < SCHEMA_VERSION; v += 1) MIGRATIONS[v]();
    db.pragma(`user_version = ${SCHEMA_VERSION}`);
    return SCHEMA_VERSION - current;
  });
  return applied();
}

migrate();

// --- Seeding --------------------------------------------------------------

/**
 * Seeds trail data from the real mountains dataset. `import-mountains` is
 * required lazily to avoid a circular dependency at module load.
 */
function seed({ force = false } = {}) {
  const trailCount = db.prepare('SELECT COUNT(*) AS n FROM trails').get().n;
  if (trailCount > 0 && !force) return { seeded: false, trails: trailCount };

  const { importMountains } = require('./import-mountains');
  const res = importMountains({ db });

  return { seeded: true, trails: res.rows, checkpoints: res.checkpoints };
}

function reset() {
  db.exec(`
    DROP TABLE IF EXISTS mountain_profiles;
    DROP TABLE IF EXISTS checkpoints;
    DROP TABLE IF EXISTS reports;
    DROP TABLE IF EXISTS volunteers;
    DROP TABLE IF EXISTS trails;
  `);
  db.exec(SCHEMA);
  db.pragma(`user_version = ${SCHEMA_VERSION}`);
}

module.exports = { db, seed, reset };

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
