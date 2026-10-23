'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fg-rep-'));
process.env.DB_PATH = path.join(tmpDir, 'test.db');
process.env.UPLOAD_DIR = path.join(tmpDir, 'uploads');
process.env.NODE_ENV = 'test';
process.env.RATE_LIMIT_MAX = '10000';

const request = require('./test-helper');

test.after(() => fs.rmSync(tmpDir, { recursive: true, force: true }));

// Smallest valid-looking JPEG header (signature FF D8 FF) for upload tests.
const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46, 0x49, 0x46, 0, 1]);

const postJson = (body) => request('/api/reports', { method: 'POST', body });

/** Builds a multipart/form-data body from string fields and file parts. */
function multipart(fields = {}, files = []) {
  const boundary = `----fgtest${Math.abs(fields.__n || 7) }${files.length}`;
  const chunks = [];
  const push = (s) => chunks.push(Buffer.from(s, 'utf-8'));

  for (const [name, value] of Object.entries(fields)) {
    if (name === '__n') continue;
    push(`--${boundary}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${value}\r\n`);
  }
  for (const f of files) {
    push(
      `--${boundary}\r\nContent-Disposition: form-data; name="photos"; filename="${f.filename}"\r\n` +
        `Content-Type: ${f.contentType}\r\n\r\n`
    );
    chunks.push(Buffer.isBuffer(f.content) ? f.content : Buffer.from(f.content));
    push('\r\n');
  }
  push(`--${boundary}--\r\n`);

  return {
    body: Buffer.concat(chunks),
    headers: { 'content-type': `multipart/form-data; boundary=${boundary}` },
  };
}

const postMultipart = (fields, files) =>
  request('/api/reports', { method: 'POST', ...multipart(fields, files) });

// --- Create ---------------------------------------------------------------

test('POST /api/reports creates a minimal report', async () => {
  const { status, body } = await postJson({ type: 'Fallen tree' });
  assert.strictEqual(status, 201);
  assert.match(body.data.id, /^rep_/);
  assert.deepStrictEqual(body.data.photos, []);
});

test('POST /api/reports rejects a missing type with 400', async () => {
  const { status, body } = await postJson({ description: 'no type given' });
  assert.strictEqual(status, 400);
  assert.strictEqual(body.error, 'validation_error');
});

test('POST /api/reports rejects an unknown trail slug with 400', async () => {
  const { status, body } = await postJson({ type: 'Hazard', trailSlug: 'not-a-trail' });
  assert.strictEqual(status, 400);
  assert.match(body.message, /unknown trail/i);
});

test('POST /api/reports defaults severity to medium', async () => {
  const { body } = await postJson({ type: 'Washout' });
  const { body: got } = await request(`/api/reports/${body.data.id}`);
  assert.strictEqual(got.data.severity, 'medium');
});

test('POST /api/reports strips reporter details when anonymous', async () => {
  const { body } = await postJson({
    type: 'Rockfall',
    anonymous: true,
    reporterName: 'Should Vanish',
    reporterEmail: 'hide@example.com',
  });
  const { body: got } = await request(`/api/reports/${body.data.id}`);
  assert.strictEqual(got.data.anonymous, true);
  assert.strictEqual(got.data.reporter, null);
});

// --- Upload validation (the reason this suite exists) ---------------------

test('POST /api/reports accepts an allowed image type', async () => {
  const { status, body } = await postMultipart(
    { type: 'Landslide' },
    [{ filename: 'a.jpg', contentType: 'image/jpeg', content: JPEG }]
  );
  assert.strictEqual(status, 201);
  assert.strictEqual(body.data.photos.length, 1);
  assert.match(body.data.photos[0], /^\/uploads\/\d+-[\w-]{8}\.jpg$/);
});

test('POST /api/reports rejects HTML disguised as an image (stored XSS)', async () => {
  const before = fs.readdirSync(process.env.UPLOAD_DIR).length;
  const { status } = await postMultipart(
    { type: 'Trash' },
    [{ filename: 'evil.html', contentType: 'image/png', content: '<script>alert(1)</script>' }]
  );
  assert.strictEqual(status, 415);
  assert.strictEqual(fs.readdirSync(process.env.UPLOAD_DIR).length, before, 'rejected file must be deleted');
});

test('saved photo extension comes from the image type, not the client filename', async () => {
  const { status, body } = await postMultipart(
    { type: 'Trash' },
    [{ filename: 'pic.svg', contentType: 'image/jpeg', content: JPEG }]
  );
  assert.strictEqual(status, 201);
  assert.match(body.data.photos[0], /\.jpg$/);
});

test('uploads are served inert, and only our own image filenames', async () => {
  const { body } = await postMultipart({ type: 'Trash' }, [{ filename: 'a.jpg', contentType: 'image/jpeg', content: JPEG }]);
  const res = await request(body.data.photos[0]);
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.headers['x-content-type-options'], 'nosniff');
  assert.match(res.headers['content-security-policy'], /sandbox/);
  fs.writeFileSync(path.join(process.env.UPLOAD_DIR, 'planted.html'), '<script></script>');
  assert.strictEqual((await request('/uploads/planted.html')).status, 404);
});

test('POST /api/reports rejects a disallowed file type with 415', async () => {
  const { status } = await postMultipart(
    { type: 'Trash' },
    [{ filename: 'note.txt', contentType: 'text/plain', content: 'not an image' }]
  );
  assert.strictEqual(status, 415);
});

test('POST /api/reports rejects more than four photos', async () => {
  const files = Array.from({ length: 5 }, (_, i) => ({
    filename: `p${i}.png`,
    contentType: 'image/png',
    content: 'x',
  }));
  const { status } = await postMultipart({ type: 'Erosion', __n: 5 }, files);
  assert.ok(status >= 400, `over-limit upload must be rejected, got ${status}`);
});

// --- Read -----------------------------------------------------------------

test('GET /api/reports lists reports, newest first', async () => {
  const { status, body } = await request('/api/reports?limit=100');
  assert.strictEqual(status, 200);
  assert.ok(Array.isArray(body.data));
  assert.ok(body.data.length >= 1);
  const times = body.data.map((r) => r.createdAt);
  const sorted = [...times].sort().reverse();
  assert.deepStrictEqual(times, sorted, 'reports must be ordered newest first');
});

test('GET /api/reports/:id 404s for an unknown id', async () => {
  const { status } = await request('/api/reports/rep_doesnotexist');
  assert.strictEqual(status, 404);
});

test('GET /api/reports never publishes reporter emails', async () => {
  await postJson({ type: 'Trash', reporterName: 'Rina', reporterEmail: 'rina@example.com' });
  const { body } = await request('/api/reports?limit=100');
  const raw = JSON.stringify(body);
  assert.ok(!raw.includes('rina@example.com'));
  assert.ok(body.data.some((r) => r.reporter && r.reporter.name === 'Rina'));
});
