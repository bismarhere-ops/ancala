"use client";

import * as React from "react";
import type { Trail } from "@/lib/types";
import { isPlannable } from "@/lib/access";
import { useLocalStorageState } from "@/lib/use-local-storage";

export type Plan = {
  slug: string;
  date: string;
  start: string;
  group: number;
};

const STORAGE_KEY = "fg.plan.v1";

/**
 * The list endpoint returns trails without checkpoints or a profile, so the
 * selected trail is loaded in full on demand. Without this the planner has no
 * timeline and the emergency card can never show a local rescue contact.
 */
function useTrailDetail(slug: string) {
  const [detail, setDetail] = React.useState<Trail | null>(null);

  React.useEffect(() => {
    if (!slug) {
      setDetail(null);
      return;
    }
    let cancelled = false;
    fetch(`/api/trails/${encodeURIComponent(slug)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (!cancelled) setDetail(json?.data ?? null);
      })
      .catch(() => {
        if (!cancelled) setDetail(null);
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  return detail;
}

type PlanContextValue = {
  plan: Plan;
  setPlan: React.Dispatch<React.SetStateAction<Plan>>;
  /** Trails the user may plan — closed mountains are excluded. */
  plannable: Trail[];
  /** The selected trail, loaded in full (checkpoints + profile) once available. */
  trail: Trail | undefined;
};

const PlanContext = React.createContext<PlanContextValue | null>(null);

/**
 * Shares the trip plan across dashboard panels so the emergency card can show
 * the rescue contact for the mountain actually being planned.
 */
export function PlanProvider({
  trails,
  children,
}: {
  trails: Trail[];
  children: React.ReactNode;
}) {
  const plannable = React.useMemo(() => trails.filter(isPlannable), [trails]);

  const [plan, setPlan] = useLocalStorageState<Plan>(STORAGE_KEY, {
    slug: plannable[0]?.slug || "",
    date: new Date().toISOString().slice(0, 10),
    start: "06:30",
    group: 2,
  });

  const summary = plannable.find((t) => t.slug === plan.slug) || plannable[0];
  const detail = useTrailDetail(summary?.slug ?? "");

  // Prefer the fully-loaded trail; fall back to the list entry while it loads
  // so the panels never flash empty.
  const trail = detail?.slug === summary?.slug ? detail : summary;

  const value = React.useMemo(
    () => ({ plan, setPlan, plannable, trail }),
    [plan, setPlan, plannable, trail]
  );

  return <PlanContext.Provider value={value}>{children}</PlanContext.Provider>;
}

export function usePlan() {
  const ctx = React.useContext(PlanContext);
  if (!ctx) throw new Error("usePlan must be used inside a PlanProvider");
  return ctx;
}
