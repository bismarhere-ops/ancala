'use strict';

/**
 * Integration tests for the trails API against a temporary database.
 *
 * A dedicated DB path is set before requiring the app so these never touch the
 * developer's working data.
 */

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fg-test-'));
process.env.DB_PATH = path.join(tmpDir, 'test.db');
process.env.NODE_ENV = 'test';
// The suite makes more requests than the production window allows.
process.env.RATE_LIMIT_MAX = '10000';

const request = require('./test-helper');

test.after(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

// --- List -----------------------------------------------------------------

test('GET /api/trails returns the imported mountains', async () => {
  const { status, body } = await request('/api/trails?limit=100');
  assert.strictEqual(status, 200);
  assert.strictEqual(body.pagination.total, 50);
  assert.strictEqual(body.data.length, 50);
});

// Every served trail must originate from the mountains dataset; anything
// without a profile is demo data that should have been pruned.
test('GET /api/trails serves only trails backed by the dataset', async () => {
  const { body } = await request('/api/trails?limit=100');
  const unbacked = body.data.filter((t) => t.accessStatus === null);
  assert.deepStrictEqual(unbacked.map((t) => t.slug), []);
});

test('GET /api/trails every trail carries an access status', async () => {
  const { body } = await request('/api/trails?limit=100');
  const missing = body.data.filter((t) => t.accessStatus === null);
  assert.deepStrictEqual(missing.map((t) => t.slug), []);
});

test('GET /api/trails?access=closed isolates the exclusion zone', async () => {
  const { body } = await request('/api/trails?access=closed');
  assert.strictEqual(body.data.length, 1);
  assert.strictEqual(body.data[0].slug, 'sinabung');
});

test('GET /api/trails?access=conditional finds the alert-gated volcanoes', async () => {
  const { body } = await request('/api/trails?access=conditional&limit=100');
  const slugs = body.data.map((t) => t.slug).sort();
  assert.deepStrictEqual(slugs, ['agung', 'guntur', 'kelud', 'merapi', 'slamet']);
});

test('GET /api/trails?reliability=high uses the normalised tier', async () => {
  const { body } = await request('/api/trails?reliability=high&limit=100');
  assert.ok(body.data.length > 0);
  assert.ok(body.data.every((t) => t.dataReliabilityTier === 'high'));
  // Sinabung's prose is "High (well-monitored by PVMBG)" — the tier normalises it.
  assert.ok(body.data.some((t) => t.slug === 'sinabung'));
});

test('list rows carry derived access policy so clients need no rules', async () => {
  const { body } = await request('/api/trails?limit=100');
  const sinabung = body.data.find((t) => t.slug === 'sinabung');
  assert.strictEqual(sinabung.plannable, false);
  const kelud = body.data.find((t) => t.slug === 'kelud');
  assert.strictEqual(kelud.plannable, true);
  assert.strictEqual(kelud.requiresAlertCheck, true);
  const ijen = body.data.find((t) => t.slug === 'ijen');
  assert.strictEqual(ijen.requiresAlertCheck, false);
});

test('GET /api/trails supports offset pagination without overlap', async () => {
  const a = await request('/api/trails?sort=name&limit=10&offset=0');
  const b = await request('/api/trails?sort=name&limit=10&offset=10');
  const overlap = a.body.data.filter((t) => b.body.data.some((o) => o.slug === t.slug));
  assert.deepStrictEqual(overlap, []);
});

test('GET /api/trails rejects an out-of-range limit', async () => {
  const { status } = await request('/api/trails?limit=9999');
  assert.strictEqual(status, 400);
});

// --- Detail ---------------------------------------------------------------

test('GET /api/trails/:slug includes the full profile', async () => {
  const { status, body } = await request('/api/trails/ijen');
  assert.strictEqual(status, 200);
  const p = body.data.profile;
  assert.ok(p, 'profile must be present');
  assert.strictEqual(p.accessStatus, 'open');
  assert.strictEqual(p.basecamp.name, 'Paltuding');
  assert.ok(p.safety.minimumGear.includes('Gas mask (activated carbon)'));
  assert.ok(p.conservation.recommendedConservation.length > 0);
});

// Regression: the detail query does not join access_status, so this was null.
test('GET /api/trails/:slug reports access status on detail routes', async () => {
  for (const [slug, expected] of [['sinabung', 'closed'], ['kelud', 'conditional'], ['ijen', 'open']]) {
    const { body } = await request(`/api/trails/${slug}`);
    assert.strictEqual(body.data.accessStatus, expected, `${slug} accessStatus`);
  }
});

test('GET /api/trails/:slug builds a cumulative checkpoint timeline', async () => {
  const { body } = await request('/api/trails/semeru');
  const cps = body.data.checkpoints;
  assert.strictEqual(cps.length, 9);
  assert.strictEqual(cps[0].name, 'Ranu Pani');
  assert.strictEqual(cps[0].km, 0);
  assert.strictEqual(cps.at(-1).name, 'Summit');
  // Distances and ETAs must increase monotonically.
  for (let i = 1; i < cps.length; i += 1) {
    assert.ok(cps[i].km >= cps[i - 1].km, 'km must not decrease');
    assert.ok(cps[i].etaMin >= cps[i - 1].etaMin, 'eta must not decrease');
  }
});

test('GET /api/trails/:slug renders Unknown source data as null', async () => {
  const { body } = await request('/api/trails/kawi');
  const p = body.data.profile;
  assert.strictEqual(p.basecamp.coordinates, null);
  assert.strictEqual(p.logistics.entryFeeIdr, null);
  // Nothing should leak the literal string.
  assert.ok(!JSON.stringify(p).includes('"Unknown"'));
});

test('GET /api/trails/:slug 404s for an unknown slug', async () => {
  const { status } = await request('/api/trails/does-not-exist');
  assert.strictEqual(status, 404);
});

// --- Offline guide --------------------------------------------------------

test('guide warns that a closed mountain must not be climbed', async () => {
  const { body } = await request('/api/trails/sinabung/guide');
  assert.strictEqual(body.accessStatus, 'closed');
  assert.match(body.warning, /CLOSED/);
});

test('guide warns that a conditional mountain depends on alert level', async () => {
  const { body } = await request('/api/trails/kelud/guide');
  assert.match(body.warning, /alert level/i);
});

test('guide carries real emergency data and no placeholder numbers', async () => {
  const { body } = await request('/api/trails/ijen/guide');
  assert.strictEqual(body.emergency.rescue, '112');
  assert.match(body.emergency.localContact, /Paltuding/);
  const serialised = JSON.stringify(body);
  assert.ok(!/\+1 ?0{3}/.test(serialised), 'no placeholder phone numbers');
});

test('guide has no warning for an open mountain', async () => {
  const { body } = await request('/api/trails/panderman/guide');
  assert.strictEqual(body.warning, undefined);
});

// --- Impact ---------------------------------------------------------------

test('GET /api/impact separates measured facts from goals', async () => {
  const { body } = await request('/api/impact');
  const metrics = body.data.metrics;

  const mountains = metrics.find((m) => m.key === 'mountains_mapped');
  assert.strictEqual(mountains.kind, 'measured');
  assert.strictEqual(mountains.value, 50, 'measured value must match the database');

  // Nothing may be published as an achievement without a data source.
  const reported = metrics.filter((m) => m.kind === 'reported');
  assert.ok(reported.length > 0);
  assert.ok(reported.every((m) => m.value === 0), 'reported metrics must not carry invented values');
  assert.ok(reported.every((m) => m.target > 0), 'reported metrics need a target');
});
