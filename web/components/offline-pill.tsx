"use client";

import Link from "next/link";
import { useOnline, useOfflineSim, usePackMeta } from "@/lib/offline";
import { cn } from "@/lib/utils";

/**
 * Honest connection badge: "OFFLINE READY" only once packs are actually
 * downloaded. Links to the pack controls on the trails page.
 */
export function OfflinePill({ className }: { className?: string }) {
  const online = useOnline();
  const [sim] = useOfflineSim();
  const pack = usePackMeta();

  const state = sim
    ? { label: "OFFLINE SIM", tone: "bg-amber-100 text-amber-900 ring-amber-300", dot: "bg-amber-500" }
    : !online
      ? pack
        ? { label: "OFFLINE · PACK", tone: "bg-amber-100 text-amber-900 ring-amber-300", dot: "bg-amber-500" }
        : { label: "OFFLINE", tone: "bg-red-100 text-red-800 ring-red-300", dot: "bg-red-500" }
      : pack
        ? { label: "OFFLINE READY", tone: "bg-secondary text-primary ring-primary/20", dot: "bg-telemetry" }
        : { label: "ONLINE", tone: "bg-muted text-muted-foreground ring-border", dot: "bg-muted-foreground/60" };

  return (
    <Link
      href="/trails#offline"
      title={pack ? `Offline packs saved for ${pack.trails} trails` : "Download trail packs for offline use"}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-wider ring-1",
        state.tone,
        className
      )}
    >
      <span className={cn("size-1.5 rounded-full", state.dot)} />
      {state.label}
    </Link>
  );
}
