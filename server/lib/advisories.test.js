'use strict';

const test = require('node:test');
const assert = require('node:assert');

const { isActive, validate } = require('./advisories');

// --- isActive -------------------------------------------------------------

const NOW = new Date('2026-09-11T00:00:00Z');

test('isActive: active with no window is showing', () => {
  assert.strictEqual(isActive({ status: 'active' }, NOW), true);
});

test('isActive: resolved is never showing', () => {
  assert.strictEqual(isActive({ status: 'resolved' }, NOW), false);
});

test('isActive: future effectiveFrom is not yet showing', () => {
  assert.strictEqual(isActive({ status: 'active', effectiveFrom: '2026-10-01' }, NOW), false);
});

test('isActive: past effectiveUntil has expired', () => {
  assert.strictEqual(isActive({ status: 'active', effectiveUntil: '2026-09-01' }, NOW), false);
});

test('isActive: today inside the window is showing', () => {
  const a = { status: 'active', effectiveFrom: '2026-09-01', effectiveUntil: '2026-09-30' };
  assert.strictEqual(isActive(a, NOW), true);
});

// --- validate -------------------------------------------------------------

function base() {
  return {
    id: 'x-fire-1',
    trail: 'semeru',
    type: 'fire',
    severity: 'danger',
    headline: 'Closed',
  };
}

test('validate: accepts a well-formed advisory', () => {
  assert.doesNotThrow(() => validate(base(), 0));
});

test('validate: rejects an unknown type', () => {
  assert.throws(() => validate({ ...base(), type: 'meteor' }, 0), /type must be one of/);
});

test('validate: rejects an unknown severity', () => {
  assert.throws(() => validate({ ...base(), severity: 'critical' }, 0), /severity must be one of/);
});

test('validate: rejects a missing trail slug', () => {
  const a = base();
  delete a.trail;
  assert.throws(() => validate(a, 0), /trail/);
});

test('validate: rejects an invalid date', () => {
  assert.throws(() => validate({ ...base(), effectiveFrom: 'soon' }, 0), /not a valid date/);
});

// --- loadAdvisories against a real DB -------------------------------------

test('loadAdvisories: replaces the table and skips unknown trails', () => {
  const os = require('os');
  const fs = require('fs');
  const path = require('path');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'adv-'));
  process.env.DB_PATH = path.join(dir, 'db.sqlite');
  // Point the loader at a fixture we control.
  const advPath = path.join(dir, 'advisories.json');
  process.env.ADVISORIES_PATH = advPath;

  // db.js seeds trails on require; write the fixture first.
  fs.writeFileSync(
    advPath,
    JSON.stringify([
      { id: 'a1', trail: 'semeru', type: 'fire', severity: 'danger', headline: 'Closed' },
      { id: 'a2', trail: 'not-a-real-trail', type: 'flood', severity: 'warning', headline: 'x' },
    ])
  );

  const { db, loadAdvisories } = require('../db');
  const res = loadAdvisories();

  assert.strictEqual(res.loaded, 1, 'only the valid-trail advisory loads');
  assert.deepStrictEqual(res.skipped, ['a2'], 'unknown trail is skipped by id');

  const rows = db.prepare('SELECT id, trail_slug FROM advisories').all();
  assert.deepStrictEqual(rows, [{ id: 'a1', trail_slug: 'semeru' }]);

  fs.rmSync(dir, { recursive: true, force: true });
});
