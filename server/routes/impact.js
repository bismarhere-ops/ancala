'use strict';

const express = require('express');
const { db } = require('../db');

const router = express.Router();

// GET /api/impact — public impact dashboard
router.get('/', (_req, res) => {
  const metrics = db.prepare(`
    SELECT key, value, label, unit, updated_at FROM impact_metrics ORDER BY key ASC
  `).all();

  // Live augmentations from other tables
  const reportCount = db.prepare('SELECT COUNT(*) AS n FROM reports').get().n;
  const volunteerCount = db.prepare("SELECT COUNT(*) AS n FROM volunteers WHERE status IN ('active','confirmed','pending')").get().n;
  const trailCount = db.prepare('SELECT COUNT(*) AS n FROM trails').get().n;

  res.json({
    data: {
      updatedAt: new Date().toISOString(),
      metrics: metrics.map((m) => ({
        key: m.key,
        value: m.value,
        label: m.label,
        unit: m.unit,
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
