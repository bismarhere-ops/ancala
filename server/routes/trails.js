'use strict';

const express = require('express');
const { z } = require('zod');
const { db } = require('../db');
const { HttpError } = require('../middleware/error');

const router = express.Router();

// --- Helpers --------------------------------------------------------------
function parseJson(col) {
  try { return col ? JSON.parse(col) : []; } catch { return []; }
}

function mapTrail(row, checkpoints = []) {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    region: row.region,
    summary: row.summary,
    distanceKm: row.distance_km,
    elevationGainM: row.elevation_gain_m,
    estimatedMinutes: row.estimated_min,
    difficulty: row.difficulty,
    risk: row.risk,
    popularity: row.popularity,
    coordinates: row.lat != null && row.lng != null ? { lat: row.lat, lng: row.lng } : null,
    tags: parseJson(row.tags),
    hazards: parseJson(row.hazards),
    checkpoints: checkpoints.map((c) => ({
      position: c.position,
      name: c.name,
      km: c.km,
      elevationM: c.elevation_m,
      etaMin: c.eta_min,
      notes: c.notes,
    })),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// --- Schemas --------------------------------------------------------------
const listQuery = z.object({
  q: z.string().trim().max(100).optional(),
  difficulty: z.enum(['easy', 'moderate', 'hard', 'expert']).optional(),
  region: z.string().trim().max(80).optional(),
  sort: z.enum(['popular', 'distance', 'elevation', 'time', 'name']).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

// --- Routes ---------------------------------------------------------------

// GET /api/trails  — list with search/filter/sort
router.get('/', (req, res) => {
  const q = listQuery.parse(req.query);
  const where = [];
  const params = {};

  if (q.q) {
    where.push('(name LIKE @q OR region LIKE @q OR summary LIKE @q)');
    params.q = `%${q.q}%`;
  }
  if (q.difficulty) {
    where.push('difficulty = @difficulty');
    params.difficulty = q.difficulty;
  }
  if (q.region) {
    where.push('region = @region');
    params.region = q.region;
  }

  const sortMap = {
    popular:   'popularity DESC, name ASC',
    distance:  'distance_km ASC',
    elevation: 'elevation_gain_m ASC',
    time:      'estimated_min ASC',
    name:      'name ASC',
  };
  const orderBy = sortMap[q.sort] || sortMap.popular;

  const limit = q.limit ?? 50;
  const offset = q.offset ?? 0;

  const sql = `
    SELECT * FROM trails
    ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
    ORDER BY ${orderBy}
    LIMIT @limit OFFSET @offset
  `;

  const rows = db.prepare(sql).all({ ...params, limit, offset });
  const countSql = `
    SELECT COUNT(*) AS n FROM trails
    ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
  `;
  const total = db.prepare(countSql).get(params).n;

  res.json({
    data: rows.map((r) => mapTrail(r)),
    pagination: { total, limit, offset },
  });
});

// GET /api/trails/:slug  — detail (with checkpoints)
router.get('/:slug', (req, res) => {
  const slug = String(req.params.slug).toLowerCase();
  const row = db.prepare('SELECT * FROM trails WHERE slug = ?').get(slug);
  if (!row) throw new HttpError(404, `Trail not found: ${slug}`);

  const checkpoints = db
    .prepare('SELECT * FROM checkpoints WHERE trail_id = ? ORDER BY position ASC')
    .all(row.id);

  res.json({ data: mapTrail(row, checkpoints) });
});

// GET /api/trails/:slug/guide  — downloadable/offline guide (plain JSON)
router.get('/:slug/guide', (req, res) => {
  const slug = String(req.params.slug).toLowerCase();
  const row = db.prepare('SELECT * FROM trails WHERE slug = ?').get(slug);
  if (!row) throw new HttpError(404, `Trail not found: ${slug}`);

  const checkpoints = db
    .prepare('SELECT * FROM checkpoints WHERE trail_id = ? ORDER BY position ASC')
    .all(row.id);

  const trail = mapTrail(row, checkpoints);
  const guide = {
    schema: 'forest-guardian.guide/v1',
    generatedAt: new Date().toISOString(),
    trail: {
      name: trail.name,
      region: trail.region,
      difficulty: trail.difficulty,
      risk: trail.risk,
      summary: trail.summary,
      distanceKm: trail.distanceKm,
      elevationGainM: trail.elevationGainM,
      estimatedMinutes: trail.estimatedMinutes,
      coordinates: trail.coordinates,
    },
    checkpoints: trail.checkpoints,
    hazards: trail.hazards,
    emergency: {
      rescue: '112',
      rangerHotline: '+1 000 000 0001',
      guardianDesk: '+1 000 000 0002',
    },
    tips: [
      'Tell someone your plan and expected return time.',
      'Carry 2L of water minimum; filter if refilling.',
      'Turn back if weather deteriorates — summit optional, return mandatory.',
    ],
  };

  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${slug}-guide.json"`
  );
  res.json(guide);
});

module.exports = router;
