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
`;

db.exec(SCHEMA);

// --- Seeding --------------------------------------------------------------
function seed({ force = false } = {}) {
  const trailCount = db.prepare('SELECT COUNT(*) AS n FROM trails').get().n;
  if (trailCount > 0 && !force) return { seeded: false, trails: trailCount };

  const trails = JSON.parse(
    fs.readFileSync(path.join(__dirname, 'data', 'seed-trails.json'), 'utf-8')
  );

  const insertTrail = db.prepare(`
    INSERT INTO trails (slug, name, region, summary, distance_km, elevation_gain_m,
                        estimated_min, difficulty, risk, popularity, lat, lng, tags, hazards)
    VALUES (@slug, @name, @region, @summary, @distanceKm, @elevationGainM,
            @estimatedMinutes, @difficulty, @risk, @popularity, @lat, @lng, @tags, @hazards)
    ON CONFLICT(slug) DO UPDATE SET
      name=excluded.name,
      region=excluded.region,
      summary=excluded.summary,
      distance_km=excluded.distance_km,
      elevation_gain_m=excluded.elevation_gain_m,
      estimated_min=excluded.estimated_min,
      difficulty=excluded.difficulty,
      risk=excluded.risk,
      popularity=excluded.popularity,
      lat=excluded.lat,
      lng=excluded.lng,
      tags=excluded.tags,
      hazards=excluded.hazards,
      updated_at=datetime('now')
    RETURNING id
  `);

  const clearCheckpoints = db.prepare('DELETE FROM checkpoints WHERE trail_id = ?');
  const insertCheckpoint = db.prepare(`
    INSERT INTO checkpoints (trail_id, position, name, km, elevation_m, eta_min, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const tx = db.transaction((items) => {
    for (const t of items) {
      const row = insertTrail.get({
        slug: t.slug,
        name: t.name,
        region: t.region,
        summary: t.summary,
        distanceKm: t.distanceKm,
        elevationGainM: t.elevationGainM,
        estimatedMinutes: t.estimatedMinutes,
        difficulty: t.difficulty,
        risk: t.risk,
        popularity: t.popularity ?? 0,
        lat: t.lat ?? null,
        lng: t.lng ?? null,
        tags: JSON.stringify(t.tags || []),
        hazards: JSON.stringify(t.hazards || []),
      });
      const trailId = row.id;
      clearCheckpoints.run(trailId);
      (t.checkpoints || []).forEach((c, i) => {
        insertCheckpoint.run(
          trailId, i, c.name, c.km,
          c.elevationM ?? null, c.etaMin ?? null, c.notes ?? null
        );
      });
    }
  });
  tx(trails);

  // Seed impact metrics (represent the live dashboard; real app would update via admin).
  const metrics = [
    { key: 'trees_planted',     value: 42380, label: 'Trees planted',     unit: 'trees' },
    { key: 'active_guardians',  value: 1250,  label: 'Active guardians',  unit: 'people' },
    { key: 'waste_collected',   value: 9450,  label: 'Waste collected',   unit: 'kg' },
    { key: 'trails_protected',  value: 87,    label: 'Trails protected',  unit: 'trails' },
    { key: 'bootcamp_graduates',value: 312,   label: 'Bootcamp graduates',unit: 'people' },
    { key: 'partner_ngos',      value: 24,    label: 'Partner NGOs',      unit: 'orgs' },
  ];
  const upsertMetric = db.prepare(`
    INSERT INTO impact_metrics (key, value, label, unit) VALUES (@key, @value, @label, @unit)
    ON CONFLICT(key) DO UPDATE SET value=excluded.value, label=excluded.label, unit=excluded.unit,
      updated_at=datetime('now')
  `);
  const mtx = db.transaction((items) => items.forEach((m) => upsertMetric.run(m)));
  mtx(metrics);

  return { seeded: true, trails: trails.length, metrics: metrics.length };
}

function reset() {
  db.exec(`
    DROP TABLE IF EXISTS checkpoints;
    DROP TABLE IF EXISTS reports;
    DROP TABLE IF EXISTS volunteers;
    DROP TABLE IF EXISTS impact_metrics;
    DROP TABLE IF EXISTS trails;
  `);
  db.exec(SCHEMA);
}

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

module.exports = { db, seed, reset };
