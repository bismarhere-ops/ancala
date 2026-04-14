'use strict';

const express = require('express');
const { z } = require('zod');
const { nanoid } = require('nanoid');
const { db } = require('../db');
const { HttpError } = require('../middleware/error');

const router = express.Router();

const registerSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(200),
  phone: z.string().trim().max(40).optional(),
  region: z.string().trim().max(80).optional(),
  interests: z
    .array(z.enum(['planting', 'cleanup', 'bootcamp', 'mentor']))
    .optional()
    .default([]),
});

// POST /api/volunteers — register as a guardian
router.post('/', (req, res) => {
  // Accept JSON body, or urlencoded multi-value `interests`.
  const payload = {
    ...req.body,
    interests: Array.isArray(req.body.interests)
      ? req.body.interests
      : req.body.interests
        ? [req.body.interests]
        : [],
  };
  const data = registerSchema.parse(payload);

  const existing = db.prepare('SELECT id FROM volunteers WHERE email = ?').get(data.email);
  if (existing) {
    throw new HttpError(409, 'This email is already registered as a guardian.');
  }

  const id = `vol_${nanoid(10)}`;
  db.prepare(`
    INSERT INTO volunteers (id, name, email, phone, region, interests)
    VALUES (@id, @name, @email, @phone, @region, @interests)
  `).run({
    id,
    name: data.name,
    email: data.email,
    phone: data.phone || null,
    region: data.region || null,
    interests: JSON.stringify(data.interests),
  });

  res.status(201).json({
    data: {
      id,
      status: 'pending',
      message: 'Welcome, Guardian. Our team will reach out within 48 hours.',
    },
  });
});

// GET /api/volunteers/stats — aggregate counts for the landing page
router.get('/stats', (_req, res) => {
  const total = db.prepare('SELECT COUNT(*) AS n FROM volunteers').get().n;
  const active = db.prepare("SELECT COUNT(*) AS n FROM volunteers WHERE status IN ('active','confirmed')").get().n;
  res.json({ data: { total, active } });
});

module.exports = router;
