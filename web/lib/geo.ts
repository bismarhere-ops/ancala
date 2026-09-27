import type { Coordinates } from "./types";

const R_KM = 6371;
const rad = (d: number) => (d * Math.PI) / 180;
const deg = (r: number) => (r * 180) / Math.PI;

/** Great-circle distance in km. */
export function distanceKm(a: Coordinates, b: Coordinates) {
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R_KM * Math.asin(Math.sqrt(h));
}

/** Initial bearing from a to b, degrees clockwise from north. */
export function bearingDeg(a: Coordinates, b: Coordinates) {
  const y = Math.sin(rad(b.lng - a.lng)) * Math.cos(rad(b.lat));
  const x =
    Math.cos(rad(a.lat)) * Math.sin(rad(b.lat)) -
    Math.sin(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.cos(rad(b.lng - a.lng));
  return (deg(Math.atan2(y, x)) + 360) % 360;
}

const POINTS = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
export const compassPoint = (b: number) => POINTS[Math.round(b / 22.5) % 16];

/** 8°25'00"S style, as printed on topo sheets. */
export function toDms(value: number, axis: "lat" | "lng") {
  const hemi = axis === "lat" ? (value < 0 ? "S" : "N") : value < 0 ? "W" : "E";
  const abs = Math.abs(value);
  const d = Math.floor(abs);
  const mFloat = (abs - d) * 60;
  const m = Math.floor(mFloat);
  const s = Math.round((mFloat - m) * 60);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d}°${pad(m)}'${pad(s === 60 ? 59 : s)}"${hemi}`;
}

export const formatCoords = (c: Coordinates) => `${toDms(c.lat, "lat")} ${toDms(c.lng, "lng")}`;

/** Google Maps link a rescuer or contact can open. */
export const mapsLink = (c: Coordinates) =>
  `https://maps.google.com/?q=${c.lat.toFixed(5)},${c.lng.toFixed(5)}`;
