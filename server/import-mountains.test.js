'use strict';

/**
 * Tests for the mountains CSV parsing and transformation logic.
 *
 * These cover the two classes of bug found during development: trail segments
 * silently dropped by an over-strict regex, and volcanoes whose alert-level
 * closures were phrased differently enough to escape access-status detection.
 *
 * Run with: npm test
 */

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const { parse, parseRecords } = require('./lib/csv');
const {
  clean,
  num,
  rangeMid,
  totalGain,
  parseSegments,
  segmentsToCheckpoints,
  mapAccessStatus,
} = require('./import-mountains');

// --- CSV parser -----------------------------------------------------------

test('csv: parses quoted fields containing commas', () => {
  const rows = parse('a,b\n"x,y",z\n');
  assert.deepStrictEqual(rows[1], ['x,y', 'z']);
});

test('csv: unescapes doubled quotes', () => {
  const rows = parse('a\n"say ""hi"""\n');
  assert.strictEqual(rows[1][0], 'say "hi"');
});

test('csv: preserves newlines inside quoted fields', () => {
  const rows = parse('a,b\n"line1\nline2",z\n');
  assert.strictEqual(rows[1][0], 'line1\nline2');
  assert.strictEqual(rows.length, 2);
});

test('csv: strips a UTF-8 BOM from the first header', () => {
  const records = parseRecords('﻿id,name\nsemeru,Semeru\n');
  assert.strictEqual(records[0].id, 'semeru');
});

test('csv: handles a file with no trailing newline', () => {
  const rows = parse('a,b\n1,2');
  assert.deepStrictEqual(rows[1], ['1', '2']);
});

// --- Unknown handling -----------------------------------------------------

test('clean: bare Unknown and N/A become null', () => {
  assert.strictEqual(clean('Unknown'), null);
  assert.strictEqual(clean('N/A'), null);
  assert.strictEqual(clean('  '), null);
});

test('clean: Unknown with a trailing explanation still becomes null', () => {
  assert.strictEqual(clean('Unknown — limited incident reporting'), null);
  assert.strictEqual(clean('N/A (closed)'), null);
});

test('clean: real values that merely mention unknown are preserved', () => {
  assert.strictEqual(clean('Route is unknown to most hikers'), 'Route is unknown to most hikers');
});

// --- Numeric coercion -----------------------------------------------------

test('num: extracts leading numbers from decorated strings', () => {
  assert.strictEqual(num('~14'), 14);
  assert.strictEqual(num('1200+'), 1200);
  assert.strictEqual(num('2,400'), 2400);
  assert.strictEqual(num('Unknown'), null);
});

test('rangeMid: averages a range and ignores parentheticals', () => {
  assert.strictEqual(rangeMid('5-7'), 6);
  assert.strictEqual(rangeMid('12-16 (2 days recommended)'), 14);
  assert.strictEqual(rangeMid('~3'), 3);
  assert.strictEqual(rangeMid('Unknown'), null);
});

test('totalGain: reads an explicit total', () => {
  assert.strictEqual(totalGain('Basecamp(1200m)>Summit(3339m): ~2100m total'), 2100);
});

test('totalGain: falls back to summing +NNNm increments', () => {
  const s = 'A>B: +300m; B>C: +300m; C>Summit: +976m';
  assert.strictEqual(totalGain(s), 1576);
});

test('totalGain: returns null when the source has no figure', () => {
  assert.strictEqual(totalGain('Unknown'), null);
});

// --- Segment parsing ------------------------------------------------------

test('parseSegments: reads distance and time per segment', () => {
  const segs = parseSegments('Ranu Pani>Watu Rejeng: ~3km/1.5h');
  assert.strictEqual(segs.length, 1);
  assert.deepStrictEqual(segs[0], {
    from: 'Ranu Pani',
    to: 'Watu Rejeng',
    km: 3,
    minutes: 90,
  });
});

test('parseSegments: supports minutes as well as hours', () => {
  const [seg] = parseSegments('Pos 2>Summit: ~1km/45min');
  assert.strictEqual(seg.minutes, 45);
});

test('parseSegments: averages a time range', () => {
  const [seg] = parseSegments('Arcopodo>Summit: ~1.5km/2-3h');
  assert.strictEqual(seg.minutes, 150);
});

// Regression: a trailing note used to break the end-of-string anchor and the
// segment was dropped without warning.
test('parseSegments: keeps segments that carry a trailing note', () => {
  const segs = parseSegments('Crater rim>Lake/blue fire: ~1km/30min (steep descent)');
  assert.strictEqual(segs.length, 1);
  assert.strictEqual(segs[0].to, 'Lake/blue fire');
  assert.strictEqual(segs[0].minutes, 30);
});

// Regression: multi-node paths ("A>B>C") produced a nonsense checkpoint name.
test('parseSegments: reduces a multi-node path to its endpoints', () => {
  const [seg] = parseSegments('Gede Summit>Saddle>Pangrango Summit: ~3km/2-3h from Gede summit');
  assert.strictEqual(seg.from, 'Gede Summit');
  assert.strictEqual(seg.to, 'Pangrango Summit');
});

test('parseSegments: returns nothing for Unknown breakdowns', () => {
  assert.deepStrictEqual(parseSegments('Unknown'), []);
  assert.deepStrictEqual(parseSegments('Unknown — limited trail documentation'), []);
});

// --- Checkpoint accumulation ---------------------------------------------

test('segmentsToCheckpoints: accumulates distance and ETA', () => {
  const cps = segmentsToCheckpoints([
    { from: 'A', to: 'B', km: 3, minutes: 90 },
    { from: 'B', to: 'C', km: 2, minutes: 60 },
  ]);
  assert.deepStrictEqual(cps, [
    { name: 'A', km: 0, etaMin: 0 },
    { name: 'B', km: 3, etaMin: 90 },
    { name: 'C', km: 5, etaMin: 150 },
  ]);
});

test('segmentsToCheckpoints: no segments yields no checkpoints', () => {
  assert.deepStrictEqual(segmentsToCheckpoints([]), []);
});

// --- Access status --------------------------------------------------------

test('mapAccessStatus: an exclusion zone is closed', () => {
  const row = { basecamp_name: 'CLOSED — no official access', permit_required: 'N/A — access prohibited' };
  assert.strictEqual(mapAccessStatus(row), 'closed');
});

test('mapAccessStatus: an explicit Conditional prefix is detected', () => {
  const row = { permit_required: 'Conditional — closed during elevated volcanic alert levels' };
  assert.strictEqual(mapAccessStatus(row), 'conditional');
});

// Regression: Merapi and Agung phrase their closures differently and were
// previously treated as freely open.
test('mapAccessStatus: detects alert-level wording outside permit_required', () => {
  const merapi = {
    permit_required: 'Yes (TNGM); closures during elevated alert',
    registration_method: 'Basecamp registration; mandatory BPPTKG activity level check',
  };
  assert.strictEqual(mapAccessStatus(merapi), 'conditional');

  const agung = {
    permit_required: 'Yes (guide mandatory)',
    best_time_months: 'April-October (check PVMBG status)',
  };
  assert.strictEqual(mapAccessStatus(agung), 'conditional');
});

test('mapAccessStatus: an ordinary trail stays open', () => {
  const row = { permit_required: 'Yes (Perhutani)', registration_method: 'Basecamp registration' };
  assert.strictEqual(mapAccessStatus(row), 'open');
});

// --- Dataset integrity ----------------------------------------------------

const CSV = path.join(__dirname, 'data', 'mountains.csv');

test('dataset: has 50 rows and a stable unique key', () => {
  const rows = parseRecords(fs.readFileSync(CSV, 'utf-8'));
  assert.strictEqual(rows.length, 50);
  const ids = new Set(rows.map((r) => r.id));
  assert.strictEqual(ids.size, 50, 'ids must be unique');
  assert.ok(rows.every((r) => r.id && r.name), 'every row needs an id and name');
});

test('dataset: every pos_breakdown segment parses', () => {
  const rows = parseRecords(fs.readFileSync(CSV, 'utf-8'));
  for (const row of rows) {
    const raw = row.pos_breakdown || '';
    if (clean(raw) === null) continue;
    const chunks = raw.split(';').filter((c) => c.includes('>'));
    const parsed = parseSegments(raw);
    assert.strictEqual(
      parsed.length,
      chunks.length,
      `${row.id}: ${chunks.length - parsed.length} segment(s) dropped`
    );
  }
});

test('dataset: difficulty and risk use the documented vocabulary', () => {
  const rows = parseRecords(fs.readFileSync(CSV, 'utf-8'));
  for (const row of rows) {
    const d = row.difficulty || '';
    assert.ok(
      /Beginner|Intermediate|Advanced|N\/A/i.test(d),
      `${row.id}: unexpected difficulty "${d}"`
    );
    const r = row.risk_level || '';
    assert.ok(/Low|Medium|High|Extreme/i.test(r), `${row.id}: unexpected risk "${r}"`);
  }
});
