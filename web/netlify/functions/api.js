'use strict';

/**
 * Netlify Function that serves the Express API (server/) on Netlify.
 *
 * Netlify has no long-running server and a read-only filesystem apart from
 * /tmp, so the SQLite database and uploads live in /tmp. The database rebuilds
 * itself from server/data/mountains.csv on each cold start. That means reports
 * and volunteer sign-ups only last as long as the function instance does.
 *
 * netlify.toml sends /api/* and /uploads/* here with their original paths
 * under /.netlify/functions/api. The prefix is removed before Express sees
 * the request.
 */

// Must be set before the server modules are required: config.js reads these
// once at load time.
process.env.DB_PATH = process.env.DB_PATH || '/tmp/forest-guardian.db';
process.env.UPLOAD_DIR = process.env.UPLOAD_DIR || '/tmp/uploads';
process.env.NODE_ENV = process.env.NODE_ENV || 'production';

const express = require('express');
const serverless = require('serverless-http');
const app = require('../../../server/server');

const FUNCTION_PREFIX = '/.netlify/functions/api';

const outer = express();
/** The caller's IP: Netlify's header first, then the first X-Forwarded-For hop. */
function clientIp(req) {
  const nf = req.headers['x-nf-client-connection-ip'];
  if (nf) return String(nf).trim();
  const xff = req.headers['x-forwarded-for'];
  if (xff) return String(xff).split(',')[0].trim();
  return req.ip;
}

outer.use((req, _res, next) => {
  // serverless-http sets `ip` directly on the request (from the Lambda
  // event's requestContext), which hides Express's X-Forwarded-For-based
  // req.ip. Without a real client IP the rate limiter puts every visitor in
  // one shared bucket, so set it here from the headers.
  const ip = clientIp(req);
  if (ip) {
    Object.defineProperty(req, 'ip', { value: ip, writable: true, configurable: true, enumerable: true });
  }
  if (req.url.startsWith(FUNCTION_PREFIX)) {
    req.url = req.url.slice(FUNCTION_PREFIX.length) || '/';
  }
  next();
});
outer.use(app);

module.exports.handler = serverless(outer, {
  // Photos served back from /uploads must be base64-encoded in the function
  // response. Base64 request bodies (multipart uploads) are decoded
  // automatically.
  binary: ['image/*'],
});
