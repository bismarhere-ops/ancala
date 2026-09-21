'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fg-vol-'));
process.env.DB_PATH = path.join(tmpDir, 'test.db');
process.env.NODE_ENV = 'test';
process.env.RATE_LIMIT_MAX = '10000';

const request = require('./test-helper');
const post = (body) => request('/api/volunteers', { method: 'POST', body });

test.after(() => fs.rmSync(tmpDir, { recursive: true, force: true }));

test('POST /api/volunteers registers a guardian', async () => {
  const { status, body } = await post({ name: 'Sari', email: 'sari@example.com', interests: ['planting'] });
  assert.strictEqual(status, 201);
  assert.match(body.data.id, /^vol_/);
  assert.strictEqual(body.data.status, 'pending');
});

test('POST /api/volunteers rejects a duplicate email with 409', async () => {
  await post({ name: 'First', email: 'dupe@example.com' });
  const { status, body } = await post({ name: 'Second', email: 'dupe@example.com' });
  assert.strictEqual(status, 409);
  assert.match(body.message, /already registered/i);
});

test('POST /api/volunteers rejects an invalid email with 400', async () => {
  const { status, body } = await post({ name: 'Bad', email: 'not-an-email' });
  assert.strictEqual(status, 400);
  assert.strictEqual(body.error, 'validation_error');
});

test('POST /api/volunteers rejects a too-short name', async () => {
  const { status } = await post({ name: 'A', email: 'shortname@example.com' });
  assert.strictEqual(status, 400);
});

test('POST /api/volunteers rejects an unknown interest value', async () => {
  const { status } = await post({ name: 'Nadia', email: 'nadia@example.com', interests: ['skydiving'] });
  assert.strictEqual(status, 400);
});

test('POST /api/volunteers coerces a single interest string into an array', async () => {
  // urlencoded form posts send one value as a bare string, not an array.
  const body = new URLSearchParams({ name: 'Budi', email: 'budi@example.com', interests: 'cleanup' }).toString();
  const { status } = await request('/api/volunteers', {
    method: 'POST',
    body,
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
  });
  assert.strictEqual(status, 201);
});

test('GET /api/volunteers/stats returns counts', async () => {
  const { status, body } = await request('/api/volunteers/stats');
  assert.strictEqual(status, 200);
  assert.ok(Number.isInteger(body.data.total));
  assert.ok(Number.isInteger(body.data.active));
  assert.ok(body.data.total >= body.data.active);
});
