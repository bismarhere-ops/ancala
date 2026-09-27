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
export const PACK_CACHE = "fg-v1-packs";
const META_KEY = "fg-offline-pack";
const SIM_KEY = "fg-offline-sim";
const CHANGE_EVENT = "fg-offline-change";

/** The list request every directory view uses, so it matches the cached copy. */
export const TRAIL_LIST_URL = "/api/trails?limit=100&sort=popular";

export interface PackMeta {
  trails: number;
  files: number;
  bytes: number;
  savedAt: string;
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

const readMeta = () => readJson<PackMeta>(META_KEY);
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
    "/trails",
    ...slugs.flatMap((s) => [
      `/api/trails/${s}`,
      `/api/trails/${s}/guide`,
      `/trails/${s}`,
      `/trails/${s}/telemetry`,
    ]),
  ];
}

/**
 * Downloads every pack. Resolves with the real totals; `onProgress` gets
 * (done, total, bytesSoFar). Failed files are skipped and not counted.
 */
export async function downloadAllPacks(
  slugs: string[],
  onProgress: (done: number, total: number, bytes: number) => void
): Promise<PackMeta> {
  const cache = await caches.open(PACK_CACHE);
  const urls = packUrls(slugs);
  let done = 0;
  let bytes = 0;
  let files = 0;

  const queue = [...urls];
  async function worker() {
    for (let url = queue.shift(); url; url = queue.shift()) {
      try {
        const res = await fetch(url, { cache: "no-store", headers: { "x-fg-refresh": "1" } });
        if (res.ok) {
          bytes += (await res.clone().arrayBuffer()).byteLength;
          await cache.put(url, res);
          files += 1;
        }
      } catch {
        /* offline mid-download: skip, the pack reports what it saved */
      }
      done += 1;
      onProgress(done, urls.length, bytes);
    }
  }
  await Promise.all(Array.from({ length: 4 }, worker));

  const meta: PackMeta = { trails: slugs.length, files, bytes, savedAt: new Date().toISOString() };
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
  const cached = typeof caches !== "undefined" ? await caches.match(url) : undefined;
  if (!cached) throw new Error(sim ? "Not in the offline pack yet." : "No connection and no cached copy.");
  return { data: (await cached.json()) as T, fromCache: true };
}

export function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}
