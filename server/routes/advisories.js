'use strict';

const express = require('express');
const { z } = require('zod');
const { db } = require('../db');

const router = express.Router();

const listQuery = z.object({
  status: z.enum(['active', 'resolved', 'all']).optional(),
  type: z.string().trim().max(20).optional(),
});

function today() {
  return new Date().toISOString().slice(0, 10);
}

function mapAdvisory(a) {
  return {
    id: a.id,
    trail: { slug: a.trail_slug },
    type: a.type,
    severity: a.severity,
    headline: a.headline,
    detail: a.detail,
    status: a.status,
    source: a.source,
    effectiveFrom: a.effective_from,
    effectiveUntil: a.effective_until,
    updatedAt: a.updated_at,
  };
}

// GET /api/advisories — public feed of live conditions.
// Defaults to currently-active advisories; ?status=all or ?status=resolved to
// widen. Read-only: advisories are edited in advisories.json and loaded on boot.
router.get('/', (req, res) => {
  const q = listQuery.parse(req.query);
  const status = q.status || 'active';

  const where = [];
  const params = {};

  if (status === 'active') {
    where.push(`status = 'active'
      AND (effective_from IS NULL OR effective_from <= @today)
      AND (effective_until IS NULL OR effective_until >= @today)`);
    params.today = today();
  } else if (status === 'resolved') {
    where.push("status = 'resolved'");
  }
  if (q.type) {
    where.push('type = @type');
    params.type = q.type;
  }

  const rows = db
    .prepare(
      `SELECT a.* FROM advisories a
       JOIN trails t ON t.id = a.trail_id
       ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
       ORDER BY CASE a.severity WHEN 'danger' THEN 3 WHEN 'warning' THEN 2 ELSE 1 END DESC,
                a.updated_at DESC`
    )
    .all(params);

  res.json({ data: rows.map(mapAdvisory) });
});

module.exports = router;
