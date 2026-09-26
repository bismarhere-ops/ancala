'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const { readStories, mapStory, validate } = require('./stories');
const { parseRecords } = require('./csv');

const STORIES_PATH = path.join(__dirname, '..', 'data', 'mountain-stories.json');
const CSV_PATH = path.join(__dirname, '..', 'data', 'mountains.csv');

const base = () => ({ origin: 'owner', tagline: 'A line.', highlights: [], stats: [] });

// --- validate -------------------------------------------------------------

test('validate: a minimal owner story passes', () => {
  assert.doesNotThrow(() => validate('x', base()));
});

test('validate: rejects an unknown origin', () => {
  assert.throws(() => validate('x', { ...base(), origin: 'guess' }), /origin/);
});

test('validate: rejects an over-long tagline', () => {
  assert.throws(() => validate('x', { ...base(), tagline: 'a'.repeat(91) }), /tagline/);
});

test('validate: researched highlights must cite a source', () => {
  const s = { ...base(), origin: 'research', highlights: [{ title: 'T', body: 'B' }] };
  assert.throws(() => validate('x', s), /source URL/);
  s.highlights[0].source = 'https://example.org/a';
  assert.doesNotThrow(() => validate('x', s));
});

test('validate: rejects too many items in a section', () => {
  const h = { title: 'T', body: 'B' };
  assert.throws(() => validate('x', { ...base(), highlights: [h, h, h, h] }), /max 3/);
});

test('validate: gallery paths must point under /mountains/', () => {
  const bad = { ...base(), gallery: [{ src: 'https://elsewhere.com/a.jpg', caption: 'C' }] };
  assert.throws(() => validate('x', bad), /gallery\[0\]\.src/);
});

test('mapStory: fills absent sections with empty arrays', () => {
  const m = mapStory({ origin: 'owner' });
  assert.deepStrictEqual(m.packing, []);
  assert.strictEqual(m.tagline, null);
  assert.strictEqual(mapStory(undefined), null);
});

// --- The shipped file -----------------------------------------------------

test('mountain-stories.json: valid, keyed by real trail slugs', () => {
  const stories = readStories(STORIES_PATH);
  const slugs = new Set(parseRecords(fs.readFileSync(CSV_PATH, 'utf-8')).map((r) => r.id));
  for (const slug of stories.keys()) assert.ok(slugs.has(slug), `unknown trail slug "${slug}"`);
});

test('mountain-stories.json: every gallery image exists in web/public', () => {
  const pub = path.join(__dirname, '..', '..', 'web', 'public');
  for (const [slug, s] of readStories(STORIES_PATH)) {
    for (const g of s.gallery ?? []) {
      assert.ok(fs.existsSync(path.join(pub, g.src)), `${slug}: missing ${g.src}`);
    }
  }
});
