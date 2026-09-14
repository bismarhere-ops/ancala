'use strict';

/**
 * Generates volcano advisories from official PVMBG alert levels.
 *
 *   node server/jobs/sync-volcano-advisories.js            # write changes
 *   node server/jobs/sync-volcano-advisories.js --dry-run  # report only
 *
 * The mapping from alert level to advisory is deterministic and encodes the
 * closure policy once:
 *   1 Normal   -> no advisory
 *   2 Waspada  -> warning (heightened activity; summit zone may be restricted)
 *   3 Siaga    -> danger  (climbing restricted)
 *   4 Awas     -> danger  (do not approach)
 *   null       -> no advisory (level unverified; the trail's conditional access
 *                 status already tells hikers to check PVMBG)
 *
 * Input is server/data/volcano-levels.json. This job OWNS only advisories whose
 * id begins with "auto-pvmbg-"; hand-written advisories are never touched. Each
 * run fully rebuilds the auto set, so a level dropping back to Normal/null
 * removes its advisory automatically.
 *
 * FULLY AUTOMATIC FETCH (not shipped): to have levels update themselves, wire
 * fetchLevels() below to the MAGMA Indonesia API (https://magma.esdm.go.id),
 * which requires a registered API token, and write the result into
 * volcano-levels.json before generate() runs. It is left unimplemented because
 * the endpoint could not be verified from the build environment, and shipping
 * an untested network write into a safety dataset would be irresponsible.
 */

const fs = require('fs');
const path = require('path');
const { parseRecords } = require('../lib/csv');
const { validate } = require('../lib/advisories');

const ROOT = path.resolve(__dirname, '..', '..');
const LEVELS_PATH = path.join(ROOT, 'server', 'data', 'volcano-levels.json');
const ADVISORIES_PATH = path.join(ROOT, 'server', 'data', 'advisories.json');
const MOUNTAINS_CSV = path.join(ROOT, 'server', 'data', 'mountains.csv');

const AUTO_PREFIX = 'auto-pvmbg-';
const SOURCE = 'PVMBG / MAGMA Indonesia (auto)';

// Alert level -> advisory shape. Levels 1 and null intentionally absent.
const LEVEL_ADVISORY = {
  2: {
    severity: 'warning',
    headline: 'PVMBG alert level II (Waspada) — heightened activity',
    detail:
      'Authorities report heightened volcanic activity. The summit and crater zone may be off-limits; check the current exclusion radius before you travel.',
  },
  3: {
    severity: 'danger',
    headline: 'PVMBG alert level III (Siaga) — climbing restricted',
    detail:
      'Access is typically restricted at Siaga. Do not approach the summit until the level is lowered.',
  },
  4: {
    severity: 'danger',
    headline: 'PVMBG alert level IV (Awas) — do not approach',
    detail:
      'Highest alert level. Evacuation zones may be in force. Do not attempt this volcano.',
  },
};

/** Builds the advisory object for a volcano at a given level, or null. */
function levelToAdvisory(slug, level) {
  const spec = LEVEL_ADVISORY[level];
  if (!spec) return null;
  return {
    id: `${AUTO_PREFIX}${slug}`,
    trail: slug,
    type: 'volcanic',
    severity: spec.severity,
    headline: spec.headline,
    detail: spec.detail,
    status: 'active',
    effectiveFrom: null,
    effectiveUntil: null,
    source: SOURCE,
  };
}

/** Valid trail slugs, read from the dataset so a typo in levels is caught. */
function knownSlugs() {
  const rows = parseRecords(fs.readFileSync(MOUNTAINS_CSV, 'utf-8'));
  return new Set(rows.map((r) => r.id));
}

/**
 * Rebuilds the auto-managed advisories from levels and merges them with the
 * hand-written ones. Pure over its inputs; returns the next advisories array.
 */
function rebuild(existing, levels, slugs) {
  const handWritten = existing.filter((a) => !a.id.startsWith(AUTO_PREFIX));
  const auto = [];
  const skipped = [];

  for (const [slug, level] of Object.entries(levels)) {
    if (level == null) continue;
    if (!slugs.has(slug)) {
      skipped.push(slug);
      continue;
    }
    const advisory = levelToAdvisory(slug, level);
    if (advisory) {
      validate(advisory, 0); // never write a malformed entry
      auto.push(advisory);
    }
  }

  return { next: [...handWritten, ...auto], autoCount: auto.length, skipped };
}

function generate({ levelsPath = LEVELS_PATH, advisoriesPath = ADVISORIES_PATH, dryRun = false } = {}) {
  const levels = JSON.parse(fs.readFileSync(levelsPath, 'utf-8')).levels || {};
  const existing = JSON.parse(fs.readFileSync(advisoriesPath, 'utf-8'));

  const { next, autoCount, skipped } = rebuild(existing, levels, knownSlugs());

  const before = JSON.stringify(existing);
  const after = JSON.stringify(next);
  const changed = before !== after;

  if (changed && !dryRun) {
    fs.writeFileSync(advisoriesPath, `${JSON.stringify(next, null, 2)}\n`);
  }

  return { changed, autoCount, skipped, next };
}

module.exports = { levelToAdvisory, rebuild, generate, AUTO_PREFIX };

if (require.main === module) {
  const dryRun = process.argv.includes('--dry-run');
  const res = generate({ dryRun });

  /* eslint-disable no-console */
  console.log(`Volcano advisories: ${res.autoCount} active from PVMBG levels`);
  if (res.skipped.length) console.log(`  skipped unknown slugs: ${res.skipped.join(', ')}`);
  console.log(res.changed ? (dryRun ? '  would update advisories.json' : '  advisories.json updated') : '  no change');
  /* eslint-enable no-console */
}
