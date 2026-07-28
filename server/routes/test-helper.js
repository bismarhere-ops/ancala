'use strict';

/**
 * Minimal in-process HTTP helper for route tests.
 *
 * Boots the Express app on an ephemeral port once, then issues real requests
 * against it so middleware, validation and error handling are all exercised.
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

/** GET `path`, resolving to { status, body }. Body is parsed as JSON when possible. */
module.exports = async function request(path) {
  const server = await start();
  const { port } = server.address();

  return new Promise((resolve, reject) => {
    http
      .get({ host: '127.0.0.1', port, path }, (res) => {
        let raw = '';
        res.setEncoding('utf-8');
        res.on('data', (c) => {
          raw += c;
        });
        res.on('end', () => {
          let body = raw;
          try {
            body = JSON.parse(raw);
          } catch {
            /* leave as text */
          }
          resolve({ status: res.statusCode, headers: res.headers, body });
        });
      })
      .on('error', reject);
  });
};
