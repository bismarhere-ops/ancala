"use client";

import * as React from "react";
import { distanceKm } from "./geo";

export interface GpsFix {
  lat: number;
  lng: number;
  /** Metres above sea level; null on devices that don't report it (most laptops). */
  altitude: number | null;
  accuracy: number;
  /** m/s, null when the device doesn't report it. */
  speed: number | null;
  t: number;
}

export type GpsStatus = "idle" | "locating" | "tracking" | "denied" | "unavailable" | "error";

export interface GpsState {
  status: GpsStatus;
  fix: GpsFix | null;
  /** Distance walked this session, km (fixes worse than 50 m are ignored). */
  distanceKm: number;
  /** Cumulative climb this session, m (changes under 3 m are treated as noise). */
  gainM: number;
  startedAt: number | null;
  error: string | null;
  /** Last accurate fixes, newest last (for grade over the recent stretch). */
  recent: GpsFix[];
}

const MAX_ACCURACY_M = 50;
const ALT_NOISE_M = 3;

/**
 * Live position from the phone's GPS. Nothing here is estimated: when there
 * is no fix, `fix` is null and the UI must say so rather than show numbers.
 * `active` starts/stops the watch; the screen is kept awake while tracking
 * where the browser supports it.
 */
export function useGps(active: boolean): GpsState {
  const [state, setState] = React.useState<GpsState>({
    status: "idle",
    fix: null,
    distanceKm: 0,
    gainM: 0,
    startedAt: null,
    error: null,
    recent: [],
  });
  const last = React.useRef<GpsFix | null>(null);
  const altBase = React.useRef<number | null>(null);

  React.useEffect(() => {
    if (!active) return;
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setState((s) => ({ ...s, status: "unavailable", error: "This device has no GPS access." }));
      return;
    }
    setState((s) => ({ ...s, status: "locating", startedAt: s.startedAt ?? Date.now(), error: null }));

    let wake: { release: () => Promise<void> } | null = null;
    const nav = navigator as Navigator & { wakeLock?: { request: (t: "screen") => Promise<{ release: () => Promise<void> }> } };
    nav.wakeLock?.request("screen").then((w) => (wake = w)).catch(() => {});

    const id = navigator.geolocation.watchPosition(
      (pos) => {
        const c = pos.coords;
        const fix: GpsFix = {
          lat: c.latitude,
          lng: c.longitude,
          altitude: c.altitude,
          accuracy: c.accuracy,
          speed: c.speed,
          t: pos.timestamp,
        };
        setState((s) => {
          let dist = s.distanceKm;
          let gain = s.gainM;
          const prev = last.current;
          if (prev && fix.accuracy <= MAX_ACCURACY_M) {
            const step = distanceKm(prev, fix);
            // Ignore movement smaller than the fix's own uncertainty.
            if (step * 1000 > fix.accuracy / 2) dist += step;
          }
          if (fix.altitude != null) {
            if (altBase.current == null) altBase.current = fix.altitude;
            const delta = fix.altitude - altBase.current;
            if (Math.abs(delta) >= ALT_NOISE_M) {
              if (delta > 0) gain += delta;
              altBase.current = fix.altitude;
            }
          }
          const good = fix.accuracy <= MAX_ACCURACY_M;
          if (good) last.current = fix;
          const recent = good ? [...s.recent, fix].slice(-30) : s.recent;
          return { ...s, status: "tracking", fix, distanceKm: dist, gainM: gain, error: null, recent };
        });
      },
      (err) => {
        setState((s) => ({
          ...s,
          status: err.code === err.PERMISSION_DENIED ? "denied" : "error",
          error:
            err.code === err.PERMISSION_DENIED
              ? "Location permission was denied. Allow it in your browser settings."
              : "No GPS fix yet. Move to open sky and wait a moment.",
        }));
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 30000 }
    );

    return () => {
      navigator.geolocation.clearWatch(id);
      wake?.release().catch(() => {});
    };
  }, [active]);

  return state;
}

/** One-shot position (for SOS). Resolves null if unavailable. */
export function getPositionOnce(timeoutMs = 15000): Promise<GpsFix | null> {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (p) =>
        resolve({
          lat: p.coords.latitude,
          lng: p.coords.longitude,
          altitude: p.coords.altitude,
          accuracy: p.coords.accuracy,
          speed: p.coords.speed,
          t: p.timestamp,
        }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 60000 }
    );
  });
}

/** Grade (%) over the most recent stretch of at least 40 m, from real fixes. */
export function recentGrade(recent: GpsFix[]): number | null {
  const now = recent[recent.length - 1];
  if (!now || now.altitude == null) return null;
  for (let i = recent.length - 2; i >= 0; i--) {
    const f = recent[i];
    if (f.altitude == null) continue;
    const d = distanceKm(f, now) * 1000;
    if (d >= 40) return ((now.altitude - f.altitude) / d) * 100;
  }
  return null;
}
