'use strict';

require('dotenv').config();

const path = require('path');

const ROOT = path.resolve(__dirname, '..');

const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 3000,
  publicUrl: process.env.PUBLIC_URL || `http://localhost:${process.env.PORT || 3000}`,

  db: {
    path: path.resolve(ROOT, process.env.DB_PATH || './data/forest-guardian.db'),
  },

  // Live trail advisories (fire, flood, closures). File is the source of truth
  // so entries survive redeploys on ephemeral hosting.
  advisories: {
    path: path.resolve(ROOT, process.env.ADVISORIES_PATH || './server/data/advisories.json'),
  },

  uploads: {
    dir: path.resolve(ROOT, process.env.UPLOAD_DIR || './server/uploads'),
    maxMb: parseInt(process.env.MAX_UPLOAD_MB, 10) || 8,
  },

  cors: {
    origin: (process.env.CORS_ORIGIN || '*')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  },

  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 60_000,
    max: parseInt(process.env.RATE_LIMIT_MAX, 10) || 120,
  },

  weather: {
    provider: process.env.WEATHER_PROVIDER || '',
    apiKey: process.env.WEATHER_API_KEY || '',
  },

  paths: {
    root: ROOT,
    publicDir: ROOT, // The PWA frontend is served from the project root.
  },
};

module.exports = config;
