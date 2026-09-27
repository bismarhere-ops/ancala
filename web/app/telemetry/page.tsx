import type { Metadata } from "next";
import Link from "next/link";
import { Activity, OctagonAlert } from "lucide-react";
import { listAllTrails } from "@/lib/api";
import { fallback } from "@/lib/server-fallback";
import { AdvisoryBadge } from "@/components/advisory-banner";

export const metadata: Metadata = {
  title: "Telemetry",
  description: "Live GPS telemetry on a topographic map for any trail, with a demo mode.",
};

export const revalidate = 60;

export default async function TelemetryIndexPage() {
  const trails = await listAllTrails({ sort: "popular" }).catch(fallback([], "trails"));
  const open = trails.filter((t) => t.plannable);
  const closed = trails.filter((t) => !t.plannable);

  return (
    <div className="container py-10">
      <div className="mb-2 font-mono text-xs font-semibold uppercase tracking-widest text-primary">Topo telemetry</div>
      <h1 className="font-display text-3xl font-semibold tracking-tight md:text-4xl">Pick a trail to track.</h1>
      <p className="mt-2 max-w-2xl text-muted-foreground">
        Your phone&apos;s GPS on a topographic map, with altitude, climb progress and the next checkpoint. Use Demo to see
        how it looks without going outside.
      </p>

      <h2 className="mt-8 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Open ({open.length})</h2>
      <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {open.map((t) => (
          <li key={t.slug}>
            <Link
              href={`/trails/${t.slug}/telemetry`}
              className="flex items-center justify-between gap-3 rounded-lg border bg-card px-4 py-3 hover:border-primary/40 hover:bg-secondary/40"
            >
              <span>
                <span className="block font-semibold">{t.name}</span>
                <span className="text-xs text-muted-foreground">
                  {t.region}
                  {t.elevationM ? ` · ${t.elevationM.toLocaleString("en-US")} m` : ""}
                </span>
              </span>
              <span className="flex items-center gap-2">
                <AdvisoryBadge level={t.advisoryLevel} />
                <Activity className="size-4 text-primary" />
              </span>
            </Link>
          </li>
        ))}
      </ul>

      {closed.length > 0 && (
        <>
          <h2 className="mt-8 flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wider text-red-700">
            <OctagonAlert className="size-4" /> Closed now ({closed.length})
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">Viewable, but tracking is disabled until they reopen.</p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {closed.map((t) => (
              <li key={t.slug}>
                <Link href={`/trails/${t.slug}/telemetry`} className="rounded-full border px-3 py-1 text-sm text-muted-foreground hover:bg-muted">
                  {t.name}
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
