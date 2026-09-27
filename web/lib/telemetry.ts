import type { Checkpoint, Trail } from "./types";

/**
 * Pure telemetry maths for the topo/field views. Inputs are the trail's
 * sourced data (checkpoints, elevations, times) and, in live mode, real GPS
 * fixes. Nothing here invents a reading: when an input is missing the result
 * is null and the UI shows "—".
 */

export interface ProfilePoint {
  km: number;
  elevationM: number | null;
  name: string;
  etaMin: number | null;
}

/** Ascent profile from checkpoints (km from start). */
export function ascentProfile(trail: Trail): { points: ProfilePoint[]; ascentKm: number; partial: boolean } {
  const cps: Checkpoint[] = trail.checkpoints ?? [];
  if (cps.length >= 2) {
    const points = cps.map((c) => ({ km: c.km, elevationM: c.elevationM, name: c.name, etaMin: c.etaMin }));
    // Start height derived from summit minus total gain, only if the source didn't name it.
    if (points[0].elevationM == null && trail.elevationM != null && trail.elevationGainM) {
      points[0] = { ...points[0], elevationM: trail.elevationM - trail.elevationGainM };
    }
    const last = points[points.length - 1];
    if (last.elevationM == null && /summit/i.test(last.name) && trail.elevationM != null) {
      points[points.length - 1] = { ...last, elevationM: trail.elevationM };
    }
    return { points, ascentKm: last.km || trail.distanceKm / 2, partial: false };
  }
  // No checkpoints: start and summit only.
  const ascentKm = trail.distanceKm / 2;
  const top = trail.elevationM;
  const start = top != null && trail.elevationGainM ? top - trail.elevationGainM : null;
  return {
    points: [
      { km: 0, elevationM: start, name: "Start", etaMin: 0 },
      { km: ascentKm, elevationM: top, name: "Summit", etaMin: trail.estimatedMinutes ? Math.round(trail.estimatedMinutes / 2) : null },
    ],
    ascentKm,
    partial: true,
  };
}

const known = (pts: ProfilePoint[]) => pts.filter((p) => p.elevationM != null) as (ProfilePoint & { elevationM: number })[];

/** Elevation at km by linear interpolation between sourced points. */
export function elevationAt(points: ProfilePoint[], km: number): number | null {
  const k = known(points);
  if (k.length < 2) return null;
  if (km <= k[0].km) return k[0].elevationM;
  for (let i = 1; i < k.length; i++) {
    if (km <= k[i].km) {
      const a = k[i - 1];
      const b = k[i];
      const t = (km - a.km) / (b.km - a.km || 1);
      return a.elevationM + (b.elevationM - a.elevationM) * t;
    }
  }
  return k[k.length - 1].elevationM;
}

/** Grade (%) of the profile around km. */
export function gradeAt(points: ProfilePoint[], km: number): number | null {
  const a = elevationAt(points, Math.max(0, km - 0.25));
  const b = elevationAt(points, km + 0.25);
  if (a == null || b == null) return null;
  return ((b - a) / 500) * 100;
}

/** First km along the ascent where the profile reaches an altitude (for placing a GPS altitude). */
export function kmAtAltitude(points: ProfilePoint[], altitude: number): number | null {
  const k = known(points);
  if (k.length < 2) return null;
  if (altitude <= k[0].elevationM) return 0;
  for (let i = 1; i < k.length; i++) {
    const a = k[i - 1];
    const b = k[i];
    if (b.elevationM > a.elevationM && altitude <= b.elevationM) {
      return a.km + ((altitude - a.elevationM) / (b.elevationM - a.elevationM)) * (b.km - a.km);
    }
  }
  return k[k.length - 1].km;
}

/** Guidebook minutes from start to km, interpolated from checkpoint ETAs. */
export function etaMinAt(points: ProfilePoint[], km: number): number | null {
  const e = points.filter((p) => p.etaMin != null) as (ProfilePoint & { etaMin: number })[];
  if (e.length < 2) return null;
  for (let i = 1; i < e.length; i++) {
    if (km <= e[i].km) {
      const a = e[i - 1];
      const b = e[i];
      return a.etaMin + ((km - a.km) / (b.km - a.km || 1)) * (b.etaMin - a.etaMin);
    }
  }
  return e[e.length - 1].etaMin;
}

export function nextCheckpoint(points: ProfilePoint[], km: number) {
  return points.find((p) => p.km > km + 0.05) ?? null;
}

export interface TelemetryReadout {
  altitudeM: number | null;
  toSummitM: number | null;
  progressKm: number | null;
  ascentKm: number;
  gradePct: number | null;
  gainM: number | null;
  paceMinPerKm: number | null;
  etaMin: number | null;
  etaBasis: "your climb rate" | "guidebook times" | null;
  profileKm: number | null;
}

/**
 * Demo readout: a simulated hiker 61.3% of the way up this trail, computed
 * from the trail's own data. Shown only with a DEMO label.
 */
export function demoReadout(trail: Trail, fraction = 0.613): TelemetryReadout {
  const { points, ascentKm } = ascentProfile(trail);
  const km = ascentKm * fraction;
  const alt = elevationAt(points, km);
  const start = elevationAt(points, 0);
  const summitEta = etaMinAt(points, ascentKm);
  const etaNow = etaMinAt(points, km);
  return {
    altitudeM: alt,
    toSummitM: alt != null && trail.elevationM != null ? trail.elevationM - alt : null,
    progressKm: km,
    ascentKm,
    gradePct: gradeAt(points, km),
    gainM: alt != null && start != null ? alt - start : null,
    paceMinPerKm: summitEta != null ? summitEta / ascentKm : null,
    etaMin: summitEta != null && etaNow != null ? summitEta - etaNow : null,
    etaBasis: "guidebook times",
    profileKm: km,
  };
}

/** Live readout from real GPS session values. */
export function liveReadout(
  trail: Trail,
  gps: { altitude: number | null; distanceKm: number; gainM: number; elapsedMin: number; gradePct: number | null }
): TelemetryReadout {
  const { points, ascentKm } = ascentProfile(trail);
  const alt = gps.altitude;
  const profileKm = alt != null ? kmAtAltitude(points, alt) : null;
  const toSummit = alt != null && trail.elevationM != null ? Math.max(0, trail.elevationM - alt) : null;

  let etaMin: number | null = null;
  let etaBasis: TelemetryReadout["etaBasis"] = null;
  if (toSummit != null && gps.gainM >= 50 && gps.elapsedMin >= 10) {
    const rate = gps.gainM / gps.elapsedMin; // m per minute, observed
    etaMin = toSummit / rate;
    etaBasis = "your climb rate";
  } else if (profileKm != null) {
    const total = etaMinAt(points, ascentKm);
    const now = etaMinAt(points, profileKm);
    if (total != null && now != null) {
      etaMin = total - now;
      etaBasis = "guidebook times";
    }
  }

  return {
    altitudeM: alt,
    toSummitM: toSummit,
    progressKm: gps.distanceKm,
    ascentKm,
    gradePct: gps.gradePct,
    gainM: gps.gainM,
    paceMinPerKm: gps.distanceKm >= 0.1 ? gps.elapsedMin / gps.distanceKm : null,
    etaMin,
    etaBasis,
    profileKm,
  };
}

export const fmtPace = (min: number | null) =>
  min == null || !Number.isFinite(min) ? "—" : `${Math.floor(min)}:${String(Math.round((min % 1) * 60)).padStart(2, "0")}`;

export const fmtEta = (min: number | null) => {
  if (min == null || !Number.isFinite(min)) return "—";
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return h ? `${h}h ${String(m).padStart(2, "0")}m` : `${m}m`;
};
