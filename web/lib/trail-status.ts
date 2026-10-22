import type { Trail } from "./types";

/**
 * One status per trail for maps, badges and counts. "closed" comes from the
 * server's plannable flag (access closed OR a live danger advisory), so a trail
 * closed by its access status is never shown as a mere warning.
 */
export type TrailStatus = "closed" | "warning" | "check" | "open";

export function trailStatus(t: Pick<Trail, "plannable" | "accessStatus" | "advisoryLevel">): TrailStatus {
  if (!t.plannable || t.accessStatus === "closed") return "closed";
  if (t.advisoryLevel === "warning" || t.advisoryLevel === "danger") return "warning";
  if (t.accessStatus === "conditional") return "check";
  return "open";
}

export const STATUS_LABEL: Record<TrailStatus, string> = {
  closed: "Closed",
  warning: "Warning",
  check: "Check alert level",
  open: "Open",
};

/** Tailwind classes per status: solid fill (pins, dots) and a soft badge. */
export const STATUS_TONE: Record<TrailStatus, { fill: string; dot: string; badge: string }> = {
  closed: { fill: "fill-red-600", dot: "bg-red-600", badge: "bg-red-50 text-red-700 ring-red-200" },
  warning: { fill: "fill-amber-500", dot: "bg-amber-500", badge: "bg-amber-50 text-amber-800 ring-amber-200" },
  check: { fill: "fill-sky-500", dot: "bg-sky-500", badge: "bg-sky-50 text-sky-800 ring-sky-200" },
  open: { fill: "fill-primary", dot: "bg-primary", badge: "bg-secondary text-primary ring-primary/20" },
};
