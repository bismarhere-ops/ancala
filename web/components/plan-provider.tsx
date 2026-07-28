"use client";

import * as React from "react";
import type { Trail } from "@/lib/types";

export type Plan = {
  slug: string;
  date: string;
  start: string;
  group: number;
};

const STORAGE_KEY = "fg.plan.v1";

function loadPlan(fallback: Plan): Plan {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    return { ...fallback, ...(JSON.parse(raw) as Partial<Plan>) };
  } catch {
    return fallback;
  }
}

type PlanContextValue = {
  plan: Plan;
  setPlan: React.Dispatch<React.SetStateAction<Plan>>;
  /** Trails the user may plan — closed mountains are excluded. */
  plannable: Trail[];
  /** The currently selected trail, or undefined if none. */
  trail: Trail | undefined;
};

const PlanContext = React.createContext<PlanContextValue | null>(null);

/**
 * Shares the trip plan across dashboard panels so the emergency card can show
 * the rescue contact for the mountain actually being planned, rather than a
 * generic list.
 */
export function PlanProvider({
  trails,
  children,
}: {
  trails: Trail[];
  children: React.ReactNode;
}) {
  const plannable = React.useMemo(
    () => trails.filter((t) => t.accessStatus !== "closed"),
    [trails]
  );

  const today = new Date().toISOString().slice(0, 10);
  const [plan, setPlan] = React.useState<Plan>({
    slug: plannable[0]?.slug || "",
    date: today,
    start: "06:30",
    group: 2,
  });

  // Hydrate from localStorage once on mount.
  React.useEffect(() => {
    setPlan((p) => loadPlan(p));
  }, []);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(plan));
  }, [plan]);

  const trail = plannable.find((t) => t.slug === plan.slug) || plannable[0];

  const value = React.useMemo(
    () => ({ plan, setPlan, plannable, trail }),
    [plan, plannable, trail]
  );

  return <PlanContext.Provider value={value}>{children}</PlanContext.Provider>;
}

export function usePlan() {
  const ctx = React.useContext(PlanContext);
  if (!ctx) throw new Error("usePlan must be used inside a PlanProvider");
  return ctx;
}
