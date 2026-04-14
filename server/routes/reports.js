'use strict';

const express = require('express');
const { z } = require('zod');
const { nanoid } = require('nanoid');
const { db } = require('../db');
const { upload, photoUrl } = require('../middleware/upload');
const { HttpError } = require('../middleware/error');

const router = express.Router();

// --- Schemas --------------------------------------------------------------
const createSchema = z.object({
  trailSlug:   z.string().trim().min(1).max(120).optional(),
  type:        z.string().trim().min(2).max(80),
  description: z.string().trim().max(2000).optional(),
  severity:    z.enum(['low', 'medium', 'high']).optional(),
  lat:         z.coerce.number().min(-90).max(90).optional(),
  lng:         z.coerce.number().min(-180).max(180).optional(),
  anonymous:   z.preprocess((v) => v === true || v === 'true' || v === 'on' || v === '1', z.boolean()).optional(),
  reporterName:  z.string().trim().max(120).optional(),
  reporterEmail: z.string().trim().email().max(200).optional(),
});

const listQuery = z.object({
  trailSlug: z.string().trim().max(120).optional(),
  status: z.enum(['new', 'ack', 'resolved']).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

// --- Helpers --------------------------------------------------------------
function mapReport(r, trailName) {
  let photos = [];
  try { photos = r.photos ? JSON.parse(r.photos) : []; } catch { /* noop */ }
  return {
    id: r.id,
    trail: trailName ? { slug: r.trail_slug, name: trailName } : null,
    type: r.type,
    description: r.description,
    severity: r.severity,
    status: r.status,
    location: r.lat != null && r.lng != null ? { lat: r.lat, lng: r.lng } : null,
    reporter: r.anonymous ? null : { name: r.reporter_name, email: r.reporter_email },
    anonymous: !!r.anonymous,
    photos,
    createdAt: r.created_at,
  };
}

// --- Routes ---------------------------------------------------------------

// POST /api/reports  (multipart: photos[]) — create a new report
router.post('/', upload.array('photos', 4), (req, res) => {
  const body = createSchema.parse(req.body);

  let trailId = null;
  if (body.trailSlug) {
    const trail = db.prepare('SELECT id FROM trails WHERE slug = ?').get(body.trailSlug);
    if (!trail) throw new HttpError(400, `Unknown trail: ${body.trailSlug}`);
    trailId = trail.id;
  }

  const photos = (req.files || []).map((f) => photoUrl(f.filename));
  const id = `rep_${nanoid(10)}`;

  const anon = body.anonymous ? 1 : 0;
  const reporterName  = anon ? null : (body.reporterName  || null);
  const reporterEmail = anon ? null : (body.reporterEmail || null);

  db.prepare(`
    INSERT INTO reports (id, trail_id, type, description, severity, lat, lng,
                         reporter_name, reporter_email, anonymous, photos)
    VALUES (@id, @trail_id, @type, @description, @severity, @lat, @lng,
            @reporter_name, @reporter_email, @anonymous, @photos)
  `).run({
    id,
    trail_id: trailId,
    type: body.type,
    description: body.description || null,
    severity: body.severity || 'medium',
    lat: body.lat ?? null,
    lng: body.lng ?? null,
    reporter_name: reporterName,
    reporter_email: reporterEmail,
    anonymous: anon,
    photos: JSON.stringify(photos),
  });

  res.status(201).json({
    data: {
      id,
      photos,
      message: 'Report received. Thank you for keeping the forest safer.',
    },
  });
});

// GET /api/reports — list (most recent first)
router.get('/', (req, res) => {
  const q = listQuery.parse(req.query);
  const where = [];
  const params = {};

  if (q.trailSlug) {
    where.push('t.slug = @trailSlug');
    params.trailSlug = q.trailSlug;
  }
  if (q.status) {
    where.push('r.status = @status');
    params.status = q.status;
  }

  const limit = q.limit ?? 20;
  const offset = q.offset ?? 0;

  const sql = `
    SELECT r.*, t.slug AS trail_slug, t.name AS trail_name
    FROM reports r
    LEFT JOIN trails t ON t.id = r.trail_id
    ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
    ORDER BY r.created_at DESC
    LIMIT @limit OFFSET @offset
  `;
  const rows = db.prepare(sql).all({ ...params, limit, offset });

  res.json({ data: rows.map((r) => mapReport(r, r.trail_name)) });
});

// GET /api/reports/:id — single
router.get('/:id', (req, res) => {
  const row = db.prepare(`
    SELECT r.*, t.slug AS trail_slug, t.name AS trail_name
    FROM reports r LEFT JOIN trails t ON t.id = r.trail_id
    WHERE r.id = ?
  `).get(req.params.id);
  if (!row) throw new HttpError(404, 'Report not found');
  res.json({ data: mapReport(row, row.trail_name) });
});

module.exports = router;
