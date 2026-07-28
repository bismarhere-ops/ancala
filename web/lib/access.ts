import type { AccessStatus, Trail } from "./types";

/**
 * Single source of truth for access policy and its copy.
 *
 * The server derives `plannable` / `requiresAlertCheck` on the trail; these
 * helpers exist so no component re-implements the rule from `accessStatus`,
 * and so the wording appears once.
 */

export const ACCESS_COPY: Record<
  Exclude<AccessStatus, "open">,
  { badge: string; title: string; body: string }
> = {
  closed: {
    badge: "Closed",
    title: "Closed to hikers",
    body: "This mountain is inside an enforced exclusion zone. Do not attempt to climb it. It is listed here for conservation and awareness only.",
  },
  conditional: {
    badge: "Check alert level",
    title: "Access depends on the volcanic alert level",
    body: "This route closes without notice when activity rises. Check the current PVMBG/BPPTKG status before you travel, and again before you set off.",
  },
};

/** Trails a user may plan. Falls back to the status when the flag is absent. */
export function isPlannable(trail: Pick<Trail, "plannable" | "accessStatus">) {
  return trail.plannable ?? trail.accessStatus !== "closed";
}

/** True when the source data is too thin to rely on for safety decisions. */
export function isLowReliability(tier: string | null | undefined) {
  return tier === "low";
}
