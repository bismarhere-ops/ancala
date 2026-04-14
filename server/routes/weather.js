'use strict';

const express = require('express');
const { z } = require('zod');
const config = require('../config');
const { db } = require('../db');
const { HttpError } = require('../middleware/error');

const router = express.Router();

const query = z.object({
  slug: z.string().trim().min(1).max(120).optional(),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
});

// Tiny in-memory cache: key -> { expires, payload }
const cache = new Map();
const TTL_MS = 10 * 60 * 1000; // 10 minutes

function cacheGet(key) {
  const hit = cache.get(key);
  if (!hit) return null;
  if (hit.expires < Date.now()) { cache.delete(key); return null; }
  return hit.payload;
}
function cacheSet(key, payload) {
  cache.set(key, { expires: Date.now() + TTL_MS, payload });
}

// Deterministic mock generator (used when no provider configured, or as fallback).
function mockForecast(lat, lng) {
  const seed = Math.abs(Math.floor((lat || 0) * 1000 + (lng || 0) * 1000));
  const rand = (n) => ((seed * (n + 13)) % 97) / 97;
  const base = 8 + rand(1) * 14; // 8–22°C
  const conditions = ['Clear', 'Partly cloudy', 'Cloudy', 'Light rain', 'Showers'];
  const days = Array.from({ length: 5 }, (_, i) => {
    const tMin = Math.round(base - 3 - rand(i + 2) * 2);
    const tMax = Math.round(base + 4 + rand(i + 3) * 4);
    return {
      date: new Date(Date.now() + i * 86_400_000).toISOString().slice(0, 10),
      condition: conditions[Math.floor(rand(i + 4) * conditions.length)],
      tempMinC: tMin,
      tempMaxC: tMax,
      windKph: Math.round(5 + rand(i + 5) * 30),
      precipitationMm: Math.round(rand(i + 6) * 8 * 10) / 10,
    };
  });
  return {
    source: 'mock',
    updatedAt: new Date().toISOString(),
    current: {
      tempC: Math.round(base + 2),
      condition: conditions[Math.floor(rand(0) * conditions.length)],
      windKph: Math.round(5 + rand(7) * 25),
      humidity: Math.round(50 + rand(8) * 40),
    },
    daily: days,
  };
}

async function fetchOpenMeteo(lat, lng) {
  // Keyless, free, no auth. Use global fetch (Node 18+).
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}` +
    `&current=temperature_2m,wind_speed_10m,relative_humidity_2m,weather_code` +
    `&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max,weather_code` +
    `&timezone=auto&forecast_days=5`;
  const res = await fetch(url, { headers: { accept: 'application/json' } });
  if (!res.ok) throw new Error(`upstream ${res.status}`);
  const json = await res.json();

  const codeToLabel = (c) => {
    if (c == null) return 'Unknown';
    if (c === 0) return 'Clear';
    if (c <= 3) return 'Partly cloudy';
    if (c <= 48) return 'Foggy';
    if (c <= 67) return 'Rain';
    if (c <= 77) return 'Snow';
    if (c <= 82) return 'Showers';
    if (c <= 99) return 'Thunderstorm';
    return 'Variable';
  };

  const daily = (json.daily?.time || []).map((date, i) => ({
    date,
    condition: codeToLabel(json.daily.weather_code?.[i]),
    tempMinC: Math.round(json.daily.temperature_2m_min?.[i]),
    tempMaxC: Math.round(json.daily.temperature_2m_max?.[i]),
    windKph: Math.round(json.daily.wind_speed_10m_max?.[i]),
    precipitationMm: Math.round((json.daily.precipitation_sum?.[i] || 0) * 10) / 10,
  }));

  return {
    source: 'open-meteo',
    updatedAt: new Date().toISOString(),
    current: {
      tempC: Math.round(json.current?.temperature_2m),
      condition: codeToLabel(json.current?.weather_code),
      windKph: Math.round(json.current?.wind_speed_10m),
      humidity: Math.round(json.current?.relative_humidity_2m),
    },
    daily,
  };
}

// GET /api/weather?slug=... | ?lat=..&lng=..
router.get('/', async (req, res, next) => {
  try {
    const { slug, lat, lng } = query.parse(req.query);

    let coords = null;
    if (slug) {
      const row = db.prepare('SELECT lat, lng FROM trails WHERE slug = ?').get(slug);
      if (!row) throw new HttpError(404, `Trail not found: ${slug}`);
      if (row.lat != null && row.lng != null) coords = { lat: row.lat, lng: row.lng };
    } else if (lat != null && lng != null) {
      coords = { lat, lng };
    }
    if (!coords) {
      throw new HttpError(400, 'Provide either ?slug= or ?lat=&lng=');
    }

    const cacheKey = `${coords.lat.toFixed(3)},${coords.lng.toFixed(3)}`;
    const cached = cacheGet(cacheKey);
    if (cached) return res.json({ data: cached, cached: true });

    let payload;
    if (config.weather.provider === 'open-meteo') {
      try {
        payload = await fetchOpenMeteo(coords.lat, coords.lng);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn('[weather] upstream failed, using mock:', err.message);
        payload = mockForecast(coords.lat, coords.lng);
      }
    } else {
      payload = mockForecast(coords.lat, coords.lng);
    }

    cacheSet(cacheKey, payload);
    res.json({ data: payload, cached: false });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
