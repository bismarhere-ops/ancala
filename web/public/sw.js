/* Forest Guardian service worker — offline support for low-signal hiking.
 *
 * Strategy by request type:
 *   - navigations (pages): network-first, fall back to the cached page, then
 *     to a generic offline page. A trail viewed once opens again with no signal.
 *   - /api/* GET: network-first, fall back to the last cached response, so
 *     trail data seen while online is still readable offline.
 *   - static assets (/_next/static, icons) and /uploads: cache-first.
 *   - everything else: cache, then network.
 *
 * Only GET is handled; POSTs (reports, volunteer sign-ups) always go to the
 * network. Bump CACHE_VERSION to invalidate old caches on the next visit.
 */
const CACHE_VERSION = 'fg-v1';
const PRECACHE = `${CACHE_VERSION}-precache`;
const RUNTIME = `${CACHE_VERSION}-runtime`;

// App shell precached on install. Pages are best-effort — a failed fetch
// (e.g. API down at build) must not abort the whole install.
const PRECACHE_URLS = [
  '/',
  '/trails',
  '/dashboard',
  '/program',
  '/community',
  '/offline.html',
  '/manifest.webmanifest',
  '/icon.svg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(PRECACHE);
      await Promise.allSettled(PRECACHE_URLS.map((u) => cache.add(u)));
      self.skipWaiting();
    })()
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((k) => !k.startsWith(CACHE_VERSION)).map((k) => caches.delete(k))
      );
      await self.clients.claim();
    })()
  );
});

function isStaticAsset(url) {
  return (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/uploads/') ||
    /\.(svg|png|jpg|jpeg|webp|ico|woff2?)$/.test(url.pathname)
  );
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const res = await fetch(request);
  if (res && res.ok) {
    const cache = await caches.open(RUNTIME);
    cache.put(request, res.clone());
  }
  return res;
}

async function networkFirst(request, { fallbackToOffline = false } = {}) {
  const cache = await caches.open(RUNTIME);
  try {
    const res = await fetch(request);
    if (res && res.ok) cache.put(request, res.clone());
    return res;
  } catch (err) {
    const cached = await caches.match(request);
    if (cached) return cached;
    if (fallbackToOffline) {
      const offline = await caches.match('/offline.html');
      if (offline) return offline;
    }
    throw err;
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // let cross-origin pass through

  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request, { fallbackToOffline: true }));
    return;
  }
  if (isStaticAsset(url)) {
    event.respondWith(cacheFirst(request));
    return;
  }
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(request));
    return;
  }
  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request))
  );
});
