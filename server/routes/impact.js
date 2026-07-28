'use strict';

const express = require('express');
const { db, syncMetrics } = require('../db');

const router = express.Router();

// GET /api/impact — public impact dashboard
//
// `measured` metrics are recomputed from the database on each request so the
// figures can never drift from reality. `reported` metrics have no data source
// yet and return value 0 against a target — clients must render these as goals,
// not achievements.
router.get('/', (_req, res) => {
  syncMetrics();

  const metrics = db.prepare(`
    SELECT key, value, target, label, unit, kind, updated_at
    FROM impact_metrics ORDER BY kind ASC, key ASC
  `).all();

  const reportCount = db.prepare('SELECT COUNT(*) AS n FROM reports').get().n;
  const volunteerCount = db.prepare("SELECT COUNT(*) AS n FROM volunteers WHERE status IN ('active','confirmed','pending')").get().n;
  const trailCount = db.prepare('SELECT COUNT(*) AS n FROM trails').get().n;

  res.json({
    data: {
      updatedAt: new Date().toISOString(),
      metrics: metrics.map((m) => ({
        key: m.key,
        value: m.value,
        target: m.target,
        label: m.label,
        unit: m.unit,
        kind: m.kind,
        updatedAt: m.updated_at,
      })),
      live: {
        reports: reportCount,
        volunteers: volunteerCount,
        trails: trailCount,
      },
    },
  });
});

module.exports = router;
