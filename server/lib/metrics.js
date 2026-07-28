'use strict';

/**
 * Impact metrics.
 *
 * `measured` metrics are counted from the database at read time — they are
 * facts about this system and cannot drift. `reported` metrics have no data
 * source yet, so they carry value 0 and a target; clients must render them as
 * goals, not achievements. Publishing invented numbers on a CSR platform is
 * the fastest way to lose a sponsor's trust.
 *
 * Nothing is persisted: every value here is either a constant or one COUNT
 * away, so storing them would only create a cache that can go stale.
 */

/** Volunteers considered "registered" for reporting purposes. */
const ACTIVE_VOLUNTEER_STATUSES = ['active', 'confirmed', 'pending'];

const REPORTED_METRICS = [
  { key: 'trees_planted', target: 60000, label: 'Trees planted', unit: 'trees' },
  { key: 'waste_collected', target: 18000, label: 'Waste collected', unit: 'kg' },
  { key: 'bootcamp_graduates', target: 650, label: 'Bootcamp graduates', unit: 'people' },
  { key: 'partner_ngos', target: 60, label: 'Partner NGOs', unit: 'orgs' },
];

const MEASURED_METRICS = [
  {
    key: 'mountains_mapped',
    target: 100,
    label: 'Mountains mapped',
    unit: 'mountains',
    sql: 'SELECT COUNT(*) AS n FROM mountain_profiles',
  },
  {
    key: 'active_guardians',
    target: 2000,
    label: 'Registered guardians',
    unit: 'people',
    sql: `SELECT COUNT(*) AS n FROM volunteers WHERE status IN (${ACTIVE_VOLUNTEER_STATUSES.map((s) => `'${s}'`).join(',')})`,
  },
  {
    key: 'field_reports',
    target: 500,
    label: 'Field reports filed',
    unit: 'reports',
    sql: 'SELECT COUNT(*) AS n FROM reports',
  },
];

/**
 * Builds a metrics reader bound to a database handle. Statements are compiled
 * once here rather than per request.
 */
function createMetricsReader(db) {
  const measured = MEASURED_METRICS.map(({ sql, ...meta }) => ({
    meta,
    stmt: db.prepare(sql),
  }));

  return function readMetrics() {
    const updatedAt = new Date().toISOString();

    return [
      ...measured.map(({ meta, stmt }) => ({
        ...meta,
        value: stmt.get().n,
        kind: 'measured',
        updatedAt,
      })),
      ...REPORTED_METRICS.map((m) => ({ ...m, value: 0, kind: 'reported', updatedAt })),
    ];
  };
}

module.exports = { createMetricsReader, ACTIVE_VOLUNTEER_STATUSES };
