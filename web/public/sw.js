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
// Bumped to fg-v2 so phones pick up the newest-copy lookup; the activate
// step below deletes the old fg-v1 caches (packs included, see offline.ts).
const CACHE_VERSION = 'fg-v2';
const PRECACHE = `${CACHE_VERSION}-precache`;
const RUNTIME = `${CACHE_VERSION}-runtime`;
// Written by the page's "Download packs" (web/lib/offline.ts PACK_CACHE).
const PACKS = `${CACHE_VERSION}-packs`;

/**
 * The NEWEST cached copy across our caches, by the response Date header.
 * A bare caches.match() searches caches in creation order, which returns the
 * install-time precache (or an old runtime copy) over a freshly downloaded
 * pack: exactly the stale data a hiker must not see offline.
 */
async function freshest(request) {
  let best = null;
  let bestT = -1;
  for (const name of [PACKS, RUNTIME, PRECACHE]) {
    const hit = await (await caches.open(name)).match(request);
    if (!hit) continue;
    const t = Date.parse(hit.headers.get('date') || '') || 0;
    if (t > bestT) {
      best = hit;
      bestT = t;
    }
  }
  return best;
}

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

const TILES = `${CACHE_VERSION}-tiles`;
const MAX_TILES = 1500;

async function cacheFirstTile(request) {
  const cache = await caches.open(TILES);
  const cached = await cache.match(request);
  if (cached) return cached;
  const res = await fetch(request);
  if (res && (res.ok || res.type === 'opaque')) {
    await cache.put(request, res.clone());
    // Keep the tile cache bounded (oldest first).
    const keys = await cache.keys();
    if (keys.length > MAX_TILES) await Promise.all(keys.slice(0, keys.length - MAX_TILES).map((k) => cache.delete(k)));
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
    const cached = await freshest(request);
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
  // Topo map tiles you've already looked at stay available with no signal.
  // Cached as viewed only (OpenTopoMap's policy discourages bulk downloads).
  if (url.hostname.endsWith('tile.opentopomap.org')) {
    event.respondWith(cacheFirstTile(request));
    return;
  }
  if (url.origin !== self.location.origin) return; // let cross-origin pass through
  // Offline-pack downloads (lib/offline.ts) must reach the network, not an
  // older cached copy; the page stores the fresh response itself.
  if (request.headers.get('x-fg-refresh')) return;

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
  event.respondWith(freshest(request).then((cached) => cached || fetch(request)));
});
