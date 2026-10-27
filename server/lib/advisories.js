'use strict';

/**
 * Live trail advisories — fire, flood, landslide, volcanic activity, closures.
 *
 * These are conditions that change in the real world, distinct from a trail's
 * permanent record. The JSON file at config.advisories.path is the SOURCE OF
 * TRUTH: it is loaded into the `advisories` table on every boot, so entries
 * survive redeploys on hosting with an ephemeral disk. Update the file (and
 * redeploy) to change what hikers see.
 */

const fs = require('fs');

const TYPES = new Set([
  'fire', 'flood', 'landslide', 'volcanic', 'weather', 'earthquake', 'closure', 'other',
]);
const SEVERITIES = new Set(['info', 'warning', 'danger']);
const STATUSES = new Set(['active', 'resolved']);

// Higher wins when summarising several advisories into one badge.
const SEVERITY_RANK = { info: 1, warning: 2, danger: 3 };

/** Throws with a clear message if an advisory record is malformed. */
function validate(a, index) {
  const where = a.id ? `advisory "${a.id}"` : `advisory #${index + 1}`;
  const bad = (msg) => {
    throw new Error(`${where}: ${msg}`);
  };

  if (!a.id || typeof a.id !== 'string') bad('missing string "id"');
  if (!a.trail || typeof a.trail !== 'string') bad('missing string "trail" (a trail slug)');
  if (!TYPES.has(a.type)) bad(`type must be one of ${[...TYPES].join(', ')}`);
  if (!SEVERITIES.has(a.severity)) bad(`severity must be one of ${[...SEVERITIES].join(', ')}`);
  if (!a.headline || typeof a.headline !== 'string') bad('missing string "headline"');
  const status = a.status || 'active';
  if (!STATUSES.has(status)) bad(`status must be one of ${[...STATUSES].join(', ')}`);
  for (const k of ['effectiveFrom', 'effectiveUntil']) {
    // Dates are compared as text against YYYY-MM-DD, so anything else (e.g.
    // "2026-9-1" or "Sep 1, 2026") would silently hide a closure. Reject it.
    if (a[k] != null && !isIsoDate(a[k])) bad(`${k} "${a[k]}" must be a real date written YYYY-MM-DD`);
  }
  if (a.effectiveFrom && a.effectiveUntil && a.effectiveUntil < a.effectiveFrom) {
    bad(`effectiveUntil ${a.effectiveUntil} is before effectiveFrom ${a.effectiveFrom}`);
  }
}

function isIsoDate(v) {
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const d = new Date(`${v}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
}

/**
 * Advisory dates are local Indonesian dates, and Indonesia spans UTC+7 (WIB)
 * to UTC+9 (WIT). To err on the side of safety a closure STARTS as soon as its
 * date has begun anywhere in Indonesia (UTC+9) and ENDS only once its last
 * date is over everywhere (UTC+7). Using the UTC date instead started
 * closures 7-9 hours late, right when pre-dawn summit pushes begin.
 */
function advisoryDays(now = new Date()) {
  const shift = (h) => new Date(now.getTime() + h * 3600 * 1000).toISOString().slice(0, 10);
  return { fromDay: shift(9), untilDay: shift(7) };
}

/**
 * An advisory is showing if it is active and today falls within its optional
 * effective window. `now` is injected so callers control the clock.
 */
function isActive(a, now = new Date()) {
  if ((a.status || a.active) === 'resolved') return false;
  if (a.status && a.status !== 'active') return false;
  const { fromDay, untilDay } = advisoryDays(now);
  if (a.effectiveFrom && a.effectiveFrom > fromDay) return false;
  if (a.effectiveUntil && a.effectiveUntil < untilDay) return false;
  return true;
}

/** Reads and validates the advisories file. Returns [] if the file is absent. */
function readFile(filePath) {
  if (!fs.existsSync(filePath)) return [];
  const raw = fs.readFileSync(filePath, 'utf-8').trim();
  if (!raw) return [];

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new Error(`advisories file is not valid JSON: ${err.message}`);
  }
  if (!Array.isArray(parsed)) throw new Error('advisories file must contain a JSON array');

  const ids = new Set();
  parsed.forEach((a, i) => {
    validate(a, i);
    if (ids.has(a.id)) throw new Error(`duplicate advisory id "${a.id}"`);
    ids.add(a.id);
  });
  return parsed;
}

/**
 * Replaces the `advisories` table from the file. Full replace (not upsert) so
 * the deployed state always matches the file exactly, including deletions.
 * Advisories whose trail slug is unknown are skipped and reported.
 */
function loadAdvisories(db, filePath) {
  const items = readFile(filePath);

  const trailId = db.prepare('SELECT id FROM trails WHERE slug = ?');
  const clear = db.prepare('DELETE FROM advisories');
  const insert = db.prepare(`
    INSERT INTO advisories
      (id, trail_id, trail_slug, type, severity, headline, detail, status,
       effective_from, effective_until, source, updated_at)
    VALUES
      (@id, @trail_id, @trail_slug, @type, @severity, @headline, @detail, @status,
       @effective_from, @effective_until, @source, datetime('now'))
  `);

  const skipped = [];
  const tx = db.transaction(() => {
    clear.run();
    for (const a of items) {
      const row = trailId.get(a.trail);
      if (!row) {
        skipped.push(a.id);
        continue;
      }
      insert.run({
        id: a.id,
        trail_id: row.id,
        trail_slug: a.trail,
        type: a.type,
        severity: a.severity,
        headline: a.headline,
        detail: a.detail ?? null,
        status: a.status || 'active',
        effective_from: a.effectiveFrom ?? null,
        effective_until: a.effectiveUntil ?? null,
        source: a.source ?? null,
      });
    }
  });
  tx();

  return { loaded: items.length - skipped.length, skipped };
}

module.exports = {
  advisoryDays,
  isIsoDate,
  loadAdvisories,
  readFile,
  isActive,
  validate,
  TYPES,
  SEVERITIES,
  SEVERITY_RANK,
};
