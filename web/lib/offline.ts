"use client";

import * as React from "react";

/**
 * Offline field packs.
 *
 * "Download all packs" fetches every trail's API data, offline guide and
 * pages into a Cache Storage bucket. The service worker already falls back
 * to Cache Storage when the network is gone (public/sw.js: caches.match
 * searches every cache), so a downloaded pack keeps the app usable with no
 * signal. Sizes shown to the user are the real byte counts of what was saved.
 *
 * "Offline simulation" is a per-browser switch that makes the data hooks here
 * read ONLY from that cache, so you can check what a hiker will see without
 * actually going offline.
 */

// Prefixed with the service worker's CACHE_VERSION so its cleanup keeps it.
// Must match the service worker's CACHE_VERSION (public/sw.js) so its
// cleanup keeps the packs and its newest-copy lookup searches them.
export const PACK_CACHE = "fg-v2-packs";
const RUNTIME_CACHE = "fg-v2-runtime";
const PRECACHE_CACHE = "fg-v2-precache";
const META_KEY = "fg-offline-pack";
const SIM_KEY = "fg-offline-sim";
const CHANGE_EVENT = "fg-offline-change";

/** The list request every directory view uses, so it matches the cached copy. */
export const TRAIL_LIST_URL = "/api/trails?limit=100&sort=popular";

export interface PackMeta {
  trails: number;
  files: number;
  /** Files that could not be saved after retries. */
  failed: number;
  /** True only when every file in the pack was saved. */
  complete: boolean;
  bytes: number;
  savedAt: string;
  /** Cache the files live in; a record for an older cache is ignored. */
  cache: string;
}

function readJson<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function notify() {
  try {
    window.dispatchEvent(new Event(CHANGE_EVENT));
  } catch {
    /* no window during SSR */
  }
}

/** Re-renders when pack metadata or the simulation switch changes (any tab). */
function useOfflineStore<T>(read: () => T, initial: T): T {
  const [value, setValue] = React.useState<T>(initial);
  React.useEffect(() => {
    const update = () => setValue(read());
    update();
    window.addEventListener(CHANGE_EVENT, update);
    window.addEventListener("storage", update);
    return () => {
      window.removeEventListener(CHANGE_EVENT, update);
      window.removeEventListener("storage", update);
    };
  }, [read]);
  return value;
}

// A service-worker version bump deletes the old pack cache, so a record that
// points at another cache describes files that no longer exist.
const readMeta = () => {
  const m = readJson<PackMeta>(META_KEY);
  return m && m.cache === PACK_CACHE ? m : null;
};
const readSim = () => readJson<boolean>(SIM_KEY) === true;

export function usePackMeta() {
  return useOfflineStore(readMeta, null);
}

export function useOfflineSim(): [boolean, (on: boolean) => void] {
  const sim = useOfflineStore(readSim, false);
  const set = React.useCallback((on: boolean) => {
    try {
      localStorage.setItem(SIM_KEY, JSON.stringify(on));
    } catch {
      /* storage blocked: the switch just won't persist */
    }
    notify();
  }, []);
  return [sim, set];
}

/** navigator.onLine, kept live. */
export function useOnline() {
  const [online, setOnline] = React.useState(true);
  React.useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  return online;
}

/** Everything a trail needs offline: data, guide, and its two pages. */
function packUrls(slugs: string[]) {
  return [
    TRAIL_LIST_URL,
    "/api/advisories",
    "/",
    "/trails",
    ...slugs.flatMap((s) => [
      `/api/trails/${s}`,
      `/api/trails/${s}/guide`,
      `/trails/${s}`,
      `/trails/${s}/telemetry`,
    ]),
  ];
}

/** Newest cached copy across our caches (same rule as the service worker). */
export async function freshestCached(url: string): Promise<Response | null> {
  if (typeof caches === "undefined") return null;
  let best: Response | null = null;
  let bestT = -1;
  for (const name of [PACK_CACHE, RUNTIME_CACHE, PRECACHE_CACHE]) {
    const hit = await (await caches.open(name)).match(url);
    if (!hit) continue;
    const t = Date.parse(hit.headers.get("date") || "") || 0;
    if (t > bestT) {
      best = hit;
      bestT = t;
    }
  }
  return best;
}

/** Script and stylesheet URLs a saved page needs to run offline. */
function assetUrls(html: string): string[] {
  const out = new Set<string>();
  for (const m of html.matchAll(/["'(](\/_next\/static\/[^"'()\s>]+)/g)) out.add(m[1].replace(/&amp;/g, "&"));
  return [...out];
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Fetch with retries for rate limits (429) and server errors, honouring Retry-After. */
async function fetchWithRetry(url: string, tries = 4): Promise<Response | null> {
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, { cache: "no-store", headers: { "x-fg-refresh": "1" } });
      if (res.ok) return res;
      if (res.status !== 429 && res.status < 500) return null;
      const retryAfter = Number(res.headers.get("retry-after"));
      await sleep(Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 1500 * 2 ** i);
    } catch {
      await sleep(1500 * 2 ** i);
    }
  }
  return null;
}

/**
 * Downloads every pack, including the scripts and styles each saved page
 * needs to work offline. Resolves with honest totals: `complete` is true only
 * when every file was saved. `onProgress` gets (done, total, bytesSoFar).
 */
export async function downloadAllPacks(
  slugs: string[],
  onProgress: (done: number, total: number, bytes: number) => void
): Promise<PackMeta> {
  const cache = await caches.open(PACK_CACHE);
  const queue = packUrls(slugs);
  const seen = new Set(queue);
  let total = queue.length;
  let done = 0;
  let bytes = 0;
  let files = 0;
  let failed = 0;

  async function worker() {
    for (let url = queue.shift(); url; url = queue.shift()) {
      const res = await fetchWithRetry(url);
      if (res) {
        try {
          const body = await res.clone().arrayBuffer();
          bytes += body.byteLength;
          if ((res.headers.get("content-type") || "").includes("text/html")) {
            // Queue the page's own scripts and styles so it can run offline.
            for (const asset of assetUrls(new TextDecoder().decode(body))) {
              if (!seen.has(asset)) {
                seen.add(asset);
                queue.push(asset);
                total += 1;
              }
            }
          }
          await cache.put(url, res);
          files += 1;
        } catch {
          failed += 1;
        }
      } else {
        failed += 1;
      }
      done += 1;
      onProgress(done, total, bytes);
    }
  }
  await Promise.all(Array.from({ length: 4 }, worker));

  const meta: PackMeta = {
    trails: slugs.length,
    files,
    failed,
    complete: failed === 0,
    bytes,
    savedAt: new Date().toISOString(),
    cache: PACK_CACHE,
  };
  try {
    localStorage.setItem(META_KEY, JSON.stringify(meta));
  } catch {
    /* ignore */
  }
  notify();
  return meta;
}

export async function clearPacks() {
  await caches.delete(PACK_CACHE);
  try {
    localStorage.removeItem(META_KEY);
  } catch {
    /* ignore */
  }
  notify();
}

/**
 * JSON from the network, falling back to any cached copy. In offline
 * simulation it reads the cache only, exactly as a hiker with no signal would.
 */
export async function fetchJsonCached<T>(url: string, sim: boolean): Promise<{ data: T; fromCache: boolean }> {
  if (!sim) {
    try {
      const res = await fetch(url);
      if (res.ok) return { data: (await res.json()) as T, fromCache: false };
    } catch {
      /* fall through to cache */
    }
  }
  const cached = await freshestCached(url);
  if (!cached) throw new Error(sim ? "Not in the offline pack yet." : "No connection and no cached copy.");
  return { data: (await cached.json()) as T, fromCache: true };
}

export function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}
