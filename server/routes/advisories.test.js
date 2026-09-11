'use strict';

/**
 * Integration tests for live advisories against a temporary database seeded
 * from a fixture advisories file. Env is set before requiring the app.
 */

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fg-adv-'));
const advPath = path.join(tmpDir, 'advisories.json');

// Wide windows so the tests never flake as the real clock advances.
fs.writeFileSync(
  advPath,
  JSON.stringify([
    { id: 'semeru-fire', trail: 'semeru', type: 'fire', severity: 'danger', headline: 'All routes closed' },
    { id: 'lawu-flood', trail: 'lawu', type: 'flood', severity: 'warning', headline: 'Flooded approach',
      effectiveFrom: '2000-01-01', effectiveUntil: '2099-12-31' },
    { id: 'merbabu-old', trail: 'merbabu', type: 'fire', severity: 'info', headline: 'Reopened', status: 'resolved' },
    { id: 'guntur-future', trail: 'guntur', type: 'closure', severity: 'info', headline: 'Planned works',
      effectiveFrom: '2099-01-01' },
    { id: 'kelud-expired', trail: 'kelud', type: 'weather', severity: 'warning', headline: 'Storm passed',
      effectiveUntil: '2000-12-31' },
  ])
);

process.env.DB_PATH = path.join(tmpDir, 'test.db');
process.env.ADVISORIES_PATH = advPath;
process.env.NODE_ENV = 'test';
process.env.RATE_LIMIT_MAX = '10000';

const request = require('./test-helper');

test.after(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

// --- Feed -----------------------------------------------------------------

test('GET /api/advisories returns only currently-active advisories', async () => {
  const { status, body } = await request('/api/advisories');
  assert.strictEqual(status, 200);
  const ids = body.data.map((a) => a.id).sort();
  // semeru (no window) + lawu (inside window); resolved/future/expired excluded.
  assert.deepStrictEqual(ids, ['lawu-flood', 'semeru-fire']);
});

test('GET /api/advisories orders danger before warning', async () => {
  const { body } = await request('/api/advisories');
  assert.strictEqual(body.data[0].severity, 'danger');
});

test('GET /api/advisories?status=all includes resolved and out-of-window', async () => {
  const { body } = await request('/api/advisories?status=all');
  assert.strictEqual(body.data.length, 5);
});

test('GET /api/advisories?type=flood filters by type', async () => {
  const { body } = await request('/api/advisories?type=flood');
  assert.deepStrictEqual(body.data.map((a) => a.id), ['lawu-flood']);
});

// --- Effect on trails -----------------------------------------------------

test('a danger advisory takes the trail out of planning', async () => {
  const { body } = await request('/api/trails/semeru');
  const t = body.data;
  assert.strictEqual(t.advisoryLevel, 'danger');
  assert.strictEqual(t.plannable, false, 'fire closes the trail to planning');
  assert.strictEqual(t.advisories.length, 1);
  assert.strictEqual(t.advisories[0].type, 'fire');
});

test('a warning advisory shows but does not block planning', async () => {
  const { body } = await request('/api/trails/lawu');
  assert.strictEqual(body.data.advisoryLevel, 'warning');
  assert.strictEqual(body.data.plannable, true);
});

test('a resolved advisory is not shown', async () => {
  const { body } = await request('/api/trails/merbabu');
  assert.strictEqual(body.data.advisories.length, 0);
  assert.strictEqual(body.data.advisoryLevel, null);
});

test('a future-dated advisory is not yet shown', async () => {
  const { body } = await request('/api/trails/guntur');
  assert.strictEqual(body.data.advisories.length, 0);
});

test('the list endpoint carries advisory level per trail', async () => {
  const { body } = await request('/api/trails?limit=100');
  const semeru = body.data.find((t) => t.slug === 'semeru');
  assert.strictEqual(semeru.advisoryLevel, 'danger');
  assert.strictEqual(semeru.plannable, false);
  const bromo = body.data.find((t) => t.slug === 'bromo');
  assert.strictEqual(bromo.advisoryLevel, null, 'unaffected trails carry no advisory');
});

test('the offline guide leads with the danger advisory', async () => {
  const { body } = await request('/api/trails/semeru/guide');
  assert.match(body.warning, /FIRE ADVISORY/);
  assert.strictEqual(body.advisories.length, 1);
});
