'use strict';

/**
 * Minimal in-process HTTP helper for route tests.
 *
 * Boots the Express app on an ephemeral port once, then issues real requests
 * against it so middleware, validation and error handling are all exercised.
 *
 *   request('/api/trails')                                  → GET
 *   request('/api/volunteers', { method: 'POST', body: {…} }) → JSON POST
 *   request('/api/reports', { method: 'POST', body: buf, headers: {…} }) → raw
 */

const http = require('http');

let serverPromise = null;

function start() {
  if (serverPromise) return serverPromise;

  serverPromise = new Promise((resolve, reject) => {
    // Required lazily so the caller can set DB_PATH first.
    const app = require('../server');
    const server = http.createServer(app);
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => resolve(server));
    server.unref();
  });

  return serverPromise;
}

/**
 * Issues a request and resolves to { status, headers, body }. Body is parsed as
 * JSON when possible. `opts.body` may be a Buffer/string (sent verbatim) or a
 * plain object (JSON-encoded with a JSON content-type).
 */
module.exports = async function request(path, opts = {}) {
  const server = await start();
  const { port } = server.address();

  const method = opts.method || 'GET';
  const headers = { ...(opts.headers || {}) };
  let body = opts.body;
  if (body != null && !Buffer.isBuffer(body) && typeof body !== 'string') {
    body = JSON.stringify(body);
    if (!headers['content-type']) headers['content-type'] = 'application/json';
  }
  if (body != null && !headers['content-length']) {
    headers['content-length'] = Buffer.byteLength(body);
  }

  return new Promise((resolve, reject) => {
    const req = http.request({ host: '127.0.0.1', port, path, method, headers }, (res) => {
      let raw = '';
      res.setEncoding('utf-8');
      res.on('data', (c) => {
        raw += c;
      });
      res.on('end', () => {
        let parsed = raw;
        try {
          parsed = JSON.parse(raw);
        } catch {
          /* leave as text */
        }
        resolve({ status: res.statusCode, headers: res.headers, body: parsed });
      });
    });
    req.on('error', reject);
    if (body != null) req.write(body);
    req.end();
  });
};
