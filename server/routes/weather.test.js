'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fg-wx-'));
process.env.DB_PATH = path.join(tmpDir, 'test.db');
process.env.NODE_ENV = 'test';
process.env.RATE_LIMIT_MAX = '10000';
// Leave WEATHER_PROVIDER unset so the route uses the deterministic mock and
// never touches the network during tests.
delete process.env.WEATHER_PROVIDER;

const request = require('./test-helper');

test.after(() => fs.rmSync(tmpDir, { recursive: true, force: true }));

test('GET /api/weather?slug= returns a forecast for a trail with coordinates', async () => {
  const { status, body } = await request('/api/weather?slug=semeru');
  assert.strictEqual(status, 200);
  assert.strictEqual(body.data.source, 'mock');
  assert.strictEqual(body.data.daily.length, 5);
  assert.ok(typeof body.data.current.tempC === 'number');
});

test('GET /api/weather?lat=&lng= returns a forecast', async () => {
  const { status, body } = await request('/api/weather?lat=-8&lng=112');
  assert.strictEqual(status, 200);
  assert.strictEqual(body.data.daily.length, 5);
});

test('GET /api/weather 404s for an unknown slug', async () => {
  const { status } = await request('/api/weather?slug=nope');
  assert.strictEqual(status, 404);
});

test('GET /api/weather 400s for a trail that has no coordinates', async () => {
  // Kawi's GPS is Unknown in the dataset, so no coords can be resolved.
  const { status, body } = await request('/api/weather?slug=kawi');
  assert.strictEqual(status, 400);
  assert.match(body.message, /slug|lat/i);
});

test('GET /api/weather 400s when neither slug nor coordinates are given', async () => {
  const { status } = await request('/api/weather');
  assert.strictEqual(status, 400);
});

test('GET /api/weather serves the second identical request from cache', async () => {
  const a = await request('/api/weather?lat=-7.5&lng=110.4');
  const b = await request('/api/weather?lat=-7.5&lng=110.4');
  assert.strictEqual(a.body.cached, false);
  assert.strictEqual(b.body.cached, true);
});

test('GET /api/weather rejects out-of-range coordinates', async () => {
  const { status } = await request('/api/weather?lat=999&lng=0');
  assert.strictEqual(status, 400);
});
