import { distanceKm } from "./geo";

/**
 * Pure GPS session accumulation, kept separate from the React hook so it can
 * be tested with simulated noise. Phone GPS altitude wanders 5-15 m even
 * when standing still, so altitude is quality-gated, median-smoothed and
 * counted only past a wide hysteresis; the climb-rate ETA uses NET gain,
 * where noise cancels out instead of accumulating.
 */

export interface TrackFix {
  lat: number;
  lng: number;
  altitude: number | null;
  /** Vertical accuracy (m) when the device reports it. */
  altitudeAccuracy?: number | null;
  accuracy: number;
  t: number;
}

export interface TrackState {
  distanceKm: number;
  /** Cumulative climb (m), hysteresis-filtered. */
  gainM: number;
  /** Smoothed altitude now minus smoothed altitude at the first good reading. */
  netGainM: number | null;
  /** Smoothed current altitude, or null with no trustworthy altitude yet. */
  smoothAltM: number | null;
  /** Last smoothed position that counted towards distance (the anchor). */
  anchor: { lat: number; lng: number } | null;
  posWindow: { lat: number; lng: number }[];
  /** Recent accurate fixes, newest last (for grade). */
  recent: TrackFix[];
  altWindow: number[];
  altStart: number | null;
  altBase: number | null;
}

export const MAX_ACCURACY_M = 50;
/** Skip altitude from fixes whose vertical error is worse than this. */
export const MAX_ALT_ACCURACY_M = 20;
/** Climb only counts once smoothed altitude moves this far from the last turn. */
export const ALT_HYSTERESIS_M = 10;
const ALT_MEDIAN_N = 9;
const RECENT_MAX = 120;
/** Distance uses the centroid of the last few good fixes, so jitter averages out. */
const POS_SMOOTH_N = 5;
/** A step counts only once the smoothed position moves this far (m). */
const MIN_STEP_M = 10;

export const emptyTrack = (): TrackState => ({
  distanceKm: 0,
  gainM: 0,
  netGainM: null,
  smoothAltM: null,
  anchor: null,
  posWindow: [],
  recent: [],
  altWindow: [],
  altStart: null,
  altBase: null,
});

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

export function advance(s: TrackState, fix: TrackFix): TrackState {
  const good = fix.accuracy <= MAX_ACCURACY_M;
  let { distanceKm: dist, gainM: gain, anchor, posWindow, altWindow, altStart, altBase, smoothAltM } = s;

  // Distance: smooth the position, and move the anchor only when a step is
  // counted, so slow walking adds up and standing still adds nothing.
  if (good) {
    posWindow = [...posWindow, { lat: fix.lat, lng: fix.lng }].slice(-POS_SMOOTH_N);
    if (posWindow.length >= Math.min(3, POS_SMOOTH_N)) {
      const pos = {
        lat: posWindow.reduce((a, p) => a + p.lat, 0) / posWindow.length,
        lng: posWindow.reduce((a, p) => a + p.lng, 0) / posWindow.length,
      };
      if (!anchor) anchor = pos;
      else {
        const step = distanceKm(anchor, pos);
        if (step * 1000 >= Math.max(MIN_STEP_M, fix.accuracy)) {
          dist += step;
          anchor = pos;
        }
      }
    }
  }

  // Altitude: gate on vertical accuracy (or horizontal when not reported).
  const vAcc = fix.altitudeAccuracy ?? fix.accuracy;
  if (good && fix.altitude != null && vAcc <= MAX_ALT_ACCURACY_M) {
    altWindow = [...altWindow, fix.altitude].slice(-ALT_MEDIAN_N);
    smoothAltM = median(altWindow);
    if (altWindow.length >= 3) {
      if (altStart == null) altStart = smoothAltM;
      if (altBase == null) altBase = smoothAltM;
      const delta = smoothAltM - altBase;
      if (delta >= ALT_HYSTERESIS_M) {
        gain += delta;
        altBase = smoothAltM;
      } else if (delta <= -ALT_HYSTERESIS_M) {
        altBase = smoothAltM;
      }
    }
  }

  return {
    distanceKm: dist,
    gainM: gain,
    netGainM: altStart != null && smoothAltM != null ? smoothAltM - altStart : null,
    smoothAltM,
    anchor,
    posWindow,
    recent: good ? [...s.recent, fix].slice(-RECENT_MAX) : s.recent,
    altWindow,
    altStart,
    altBase,
  };
}
