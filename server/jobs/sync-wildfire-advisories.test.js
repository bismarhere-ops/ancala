'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const {
  haversineKm,
  confidenceRank,
  trailCoords,
  matchHotspots,
  rebuild,
  generate,
} = require('./sync-wildfire-advisories');

// Semeru summit, from mountains.csv.
const SEMERU = { lat: -8.108, lng: 112.922 };
const NOW = new Date('2026-09-14T00:00:00Z');

// --- geometry & confidence ------------------------------------------------

test('haversineKm: ~0 for the same point, sane for a known gap', () => {
  assert.ok(haversineKm(SEMERU.lat, SEMERU.lng, SEMERU.lat, SEMERU.lng) < 0.001);
  // Semeru summit to basecamp is roughly 11 km.
  const d = haversineKm(-8.108, 112.922, -8.009, 112.929);
  assert.ok(d > 9 && d < 13, `expected ~11km, got ${d}`);
});

test('confidenceRank: handles letters and numbers', () => {
  assert.strictEqual(confidenceRank('l'), 1);
  assert.strictEqual(confidenceRank('h'), 3);
  assert.strictEqual(confidenceRank(10), 1);
  assert.strictEqual(confidenceRank(90), 3);
  assert.strictEqual(confidenceRank(null), 2);
});

// --- matching -------------------------------------------------------------

const coords = new Map([['semeru', SEMERU]]);

test('a nearby recent hotspot matches its trail', () => {
  const m = matchHotspots(coords, [
    { latitude: -8.108, longitude: 112.922, confidence: 'h', acq_date: '2026-09-13' },
  ], { now: NOW });
  assert.strictEqual(m.get('semeru').count, 1);
  assert.ok(m.get('semeru').nearestKm < 1);
});

test('a distant hotspot does not match', () => {
  const m = matchHotspots(coords, [
    { latitude: 0, longitude: 0, confidence: 'h', acq_date: '2026-09-13' },
  ], { now: NOW });
  assert.strictEqual(m.size, 0);
});

test('an old hotspot is ignored', () => {
  const m = matchHotspots(coords, [
    { latitude: -8.108, longitude: 112.922, confidence: 'h', acq_date: '2026-01-01' },
  ], { now: NOW });
  assert.strictEqual(m.size, 0);
});

test('a low-confidence hotspot is ignored by default', () => {
  const m = matchHotspots(coords, [
    { latitude: -8.108, longitude: 112.922, confidence: 'l', acq_date: '2026-09-13' },
  ], { now: NOW });
  assert.strictEqual(m.size, 0);
});

// --- merge safety & policy ------------------------------------------------

test('rebuild emits a WARNING (never an auto-close)', () => {
  const { next } = rebuild([], new Map([['semeru', { count: 2, nearestKm: 1.2 }]]), {});
  assert.strictEqual(next[0].severity, 'warning');
  assert.strictEqual(next[0].type, 'fire');
  assert.strictEqual(next[0].id, 'auto-fire-semeru');
});

test('rebuild leaves volcano and hand-written advisories untouched', () => {
  const existing = [
    { id: 'auto-pvmbg-merapi', trail: 'merapi', type: 'volcanic', severity: 'danger', headline: 'x' },
    { id: 'lawu-flood', trail: 'lawu', type: 'flood', severity: 'warning', headline: 'y' },
  ];
  const { next } = rebuild(existing, new Map([['semeru', { count: 1, nearestKm: 2 }]]), {});
  const ids = next.map((a) => a.id).sort();
  assert.deepStrictEqual(ids, ['auto-fire-semeru', 'auto-pvmbg-merapi', 'lawu-flood']);
});

test('a fire clearing removes its auto-fire advisory', () => {
  const existing = [{ id: 'auto-fire-semeru', trail: 'semeru', type: 'fire', severity: 'warning', headline: 'old' }];
  const { next, autoCount } = rebuild(existing, new Map(), {});
  assert.strictEqual(autoCount, 0);
  assert.strictEqual(next.length, 0);
});

// --- coordinate gap -------------------------------------------------------

test('trailCoords includes only trails that have GPS', () => {
  const map = trailCoords();
  assert.ok(map.has('semeru') && map.has('bromo') && map.has('ijen'));
  assert.ok(!map.has('kawi'), 'a trail without coordinates cannot be matched');
});

// --- generate() over real files ------------------------------------------

test('generate ships a no-op on the committed empty hotspots file', () => {
  const res = generate({ dryRun: true });
  assert.strictEqual(res.autoCount, 0);
  assert.strictEqual(res.changed, false, 'no advisory fabricated from an empty hotspot list');
});

test('generate writes a warning when a hotspot sits on a coordinated trail', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fire-'));
  const hotspotsPath = path.join(dir, 'hotspots.json');
  const advPath = path.join(dir, 'advisories.json');
  fs.writeFileSync(
    hotspotsPath,
    JSON.stringify({ hotspots: [{ latitude: -8.108, longitude: 112.922, confidence: 'h', acq_date: '2026-09-13' }] })
  );
  fs.writeFileSync(advPath, '[]\n');

  const res = generate({ hotspotsPath, advisoriesPath: advPath, now: NOW });
  assert.strictEqual(res.changed, true);
  const written = JSON.parse(fs.readFileSync(advPath, 'utf-8'));
  assert.strictEqual(written[0].id, 'auto-fire-semeru');
  assert.strictEqual(written[0].severity, 'warning');

  fs.rmSync(dir, { recursive: true, force: true });
});
