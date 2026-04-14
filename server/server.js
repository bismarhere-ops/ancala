'use strict';

const path = require('path');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const config = require('./config');
require('./db'); // ensures schema + seed on boot

const { notFound, errorHandler } = require('./middleware/error');

const trailsRouter     = require('./routes/trails');
const weatherRouter    = require('./routes/weather');
const reportsRouter    = require('./routes/reports');
const volunteersRouter = require('./routes/volunteers');
const impactRouter     = require('./routes/impact');

const app = express();

app.disable('x-powered-by');
app.set('trust proxy', 1);

// --- Security & parsing ---------------------------------------------------
app.use(helmet({
  contentSecurityPolicy: false, // PWA inline scripts/styles — tighten per deployment
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

const corsOrigin = config.cors.origin.includes('*') ? true : config.cors.origin;
app.use(cors({ origin: corsOrigin, credentials: false }));

const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'rate_limited', message: 'Too many requests — slow down.' },
});
app.use('/api/', limiter);

// --- Health / meta --------------------------------------------------------
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'forest-guardian-api',
    env: config.env,
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

// --- API routes -----------------------------------------------------------
app.use('/api/trails',     trailsRouter);
app.use('/api/weather',    weatherRouter);
app.use('/api/reports',    reportsRouter);
app.use('/api/volunteers', volunteersRouter);
app.use('/api/impact',     impactRouter);

// --- Uploaded photos (public) --------------------------------------------
app.use('/uploads', express.static(config.uploads.dir, {
  fallthrough: true,
  immutable: true,
  maxAge: '30d',
}));

// --- PWA frontend (static) -----------------------------------------------
// Serves index.html, trails.html, etc. from the project root.
app.use(express.static(config.paths.publicDir, {
  extensions: ['html'],
  maxAge: '1h',
  setHeaders(res, filePath) {
    if (filePath.endsWith('service-worker.js')) {
      // Service worker must never be cached.
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    }
    if (filePath.endsWith('manifest.json')) {
      res.setHeader('Cache-Control', 'public, max-age=300');
    }
  },
}));

// --- Errors ---------------------------------------------------------------
app.use(notFound);
app.use(errorHandler);

// --- Boot -----------------------------------------------------------------
if (require.main === module) {
  app.listen(config.port, () => {
    // eslint-disable-next-line no-console
    console.log(`Forest Guardian API listening on ${config.publicUrl} [${config.env}]`);
  });
}

module.exports = app;
