'use strict';

const express = require('express');
const { db } = require('../db');
const { createMetricsReader } = require('../lib/metrics');

const router = express.Router();

const readMetrics = createMetricsReader(db);

// GET /api/impact — public impact dashboard.
//
// Everything is computed at read time, so measured figures can never drift
// from the database and the endpoint stays read-only.
router.get('/', (_req, res) => {
  res.json({
    data: {
      updatedAt: new Date().toISOString(),
      metrics: readMetrics(),
    },
  });
});

module.exports = router;
