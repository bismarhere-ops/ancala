'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { levelToAdvisory, rebuild, generate, AUTO_PREFIX } = require('./sync-volcano-advisories');

const SLUGS = new Set(['semeru', 'merapi', 'kelud']);

// --- level -> advisory ----------------------------------------------------

test('level 1 (Normal) and null produce no advisory', () => {
  assert.strictEqual(levelToAdvisory('merapi', 1), null);
  assert.strictEqual(levelToAdvisory('merapi', null), null);
});

test('level 2 (Waspada) is a warning', () => {
  const a = levelToAdvisory('merapi', 2);
  assert.strictEqual(a.severity, 'warning');
  assert.strictEqual(a.type, 'volcanic');
  assert.strictEqual(a.id, 'auto-pvmbg-merapi');
});

test('levels 3 and 4 are danger', () => {
  assert.strictEqual(levelToAdvisory('merapi', 3).severity, 'danger');
  assert.strictEqual(levelToAdvisory('merapi', 4).severity, 'danger');
});

// --- merge safety ---------------------------------------------------------

test('rebuild preserves hand-written advisories', () => {
  const existing = [
    { id: 'semeru-fire-manual', trail: 'semeru', type: 'fire', severity: 'danger', headline: 'x' },
  ];
  const { next } = rebuild(existing, { merapi: 3 }, SLUGS);
  assert.ok(next.some((a) => a.id === 'semeru-fire-manual'), 'hand-written entry kept');
  assert.ok(next.some((a) => a.id === 'auto-pvmbg-merapi'), 'auto entry added');
});

test('rebuild replaces stale auto entries when a level drops', () => {
  const existing = [{ id: 'auto-pvmbg-merapi', trail: 'merapi', type: 'volcanic', severity: 'danger', headline: 'old' }];
  // Merapi back to Normal -> its auto advisory should disappear.
  const { next, autoCount } = rebuild(existing, { merapi: 1 }, SLUGS);
  assert.strictEqual(autoCount, 0);
  assert.strictEqual(next.length, 0);
});

test('rebuild skips unknown slugs instead of emitting bad data', () => {
  const { next, skipped } = rebuild([], { 'not-a-volcano': 4 }, SLUGS);
  assert.deepStrictEqual(skipped, ['not-a-volcano']);
  assert.strictEqual(next.length, 0);
});

// --- generate() over real files ------------------------------------------

test('generate writes advisories.json only when it changes', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'volc-'));
  const levelsPath = path.join(dir, 'levels.json');
  const advPath = path.join(dir, 'advisories.json');
  fs.writeFileSync(levelsPath, JSON.stringify({ levels: { kelud: 3 } }));
  fs.writeFileSync(advPath, '[]\n');

  const first = generate({ levelsPath, advisoriesPath: advPath });
  assert.strictEqual(first.changed, true);
  assert.strictEqual(first.autoCount, 1);
  const written = JSON.parse(fs.readFileSync(advPath, 'utf-8'));
  assert.strictEqual(written[0].id, 'auto-pvmbg-kelud');
  assert.strictEqual(written[0].severity, 'danger');

  // Running again with the same level is a no-op.
  const second = generate({ levelsPath, advisoriesPath: advPath });
  assert.strictEqual(second.changed, false);

  fs.rmSync(dir, { recursive: true, force: true });
});

test('generate ships a no-op on the committed all-null levels file', () => {
  // The real files: levels are all null, so nothing is generated and the
  // committed advisories.json is left untouched.
  const res = generate({ dryRun: true });
  assert.strictEqual(res.autoCount, 0);
  assert.strictEqual(res.changed, false, 'no advisory fabricated from unverified levels');
});

test('every auto advisory targets a real trail slug', () => {
  // Guard: the levels file must not list a volcano slug the dataset lacks.
  const levels = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'volcano-levels.json'), 'utf-8')).levels;
  const rows = require('../lib/csv').parseRecords(
    fs.readFileSync(path.join(__dirname, '..', 'data', 'mountains.csv'), 'utf-8')
  );
  const slugs = new Set(rows.map((r) => r.id));
  const unknown = Object.keys(levels).filter((s) => !slugs.has(s));
  assert.deepStrictEqual(unknown, [], `volcano-levels.json lists unknown slugs: ${unknown.join(', ')}`);
});

void AUTO_PREFIX;
