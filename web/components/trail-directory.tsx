"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Activity,
  AlertTriangle,
  Compass,
  Map as MapIcon,
  MapPin,
  Mountain,
  Search,
  WifiOff,
  X,
} from "lucide-react";
import { ArchipelagoMap } from "@/components/archipelago-map";
import { OfflinePackPanel } from "@/components/offline-pack-panel";
import { TrailCard } from "@/components/trail-card";
import { AdvisoryBadge } from "@/components/advisory-banner";
import { Button } from "@/components/ui/button";
import { ISLANDS, islandOf, provinceLabel, type IslandId } from "@/lib/regions";
import { TRAIL_LIST_URL, fetchJsonCached, useOfflineSim } from "@/lib/offline";
import type { Trail, TrailListResponse } from "@/lib/types";
import { cn, formatMinutes } from "@/lib/utils";

type DifficultyFilter = "all" | "easy" | "moderate" | "hard";

const matchesDifficulty = (t: Trail, d: DifficultyFilter) =>
  d === "all" || (d === "hard" ? t.difficulty === "hard" || t.difficulty === "expert" : t.difficulty === d);

export function TrailDirectory({ initialTrails }: { initialTrails: Trail[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [sim] = useOfflineSim();

  // Offline simulation swaps the server list for the cached pack.
  const [simTrails, setSimTrails] = React.useState<Trail[] | null>(null);
  const [simError, setSimError] = React.useState<string | null>(null);
  React.useEffect(() => {
    if (!sim) {
      setSimTrails(null);
      setSimError(null);
      return;
    }
    fetchJsonCached<TrailListResponse>(TRAIL_LIST_URL, true)
      .then(({ data }) => setSimTrails(data.data))
      .catch((e: Error) => setSimError(e.message));
  }, [sim]);
  const trails = React.useMemo(() => (sim ? simTrails ?? [] : initialTrails), [sim, simTrails, initialTrails]);

  const q = params.get("q") ?? "";
  const difficulty = (params.get("difficulty") as DifficultyFilter) || "all";
  const island = (params.get("island") as IslandId) || "all";
  const region = params.get("region") ?? "";
  const mapView = params.get("view") === "map";

  const setParams = React.useCallback(
    (updates: Record<string, string | null>) => {
      const sp = new URLSearchParams(params.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (!value || value === "all") sp.delete(key);
        else sp.set(key, value);
      }
      const qs = sp.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [params, pathname, router]
  );
  const setParam = React.useCallback(
    (key: string, value: string | null) => setParams({ [key]: value }),
    [setParams]
  );

  const [query, setQuery] = React.useState(q);
  React.useEffect(() => setQuery(q), [q]);
  React.useEffect(() => {
    const id = setTimeout(() => query !== q && setParam("q", query.trim() || null), 250);
    return () => clearTimeout(id);
  }, [query, q, setParam]);

  const inScope = React.useMemo(() => {
    const needle = q.toLowerCase();
    return trails.filter(
      (t) =>
        (island === "all" || islandOf(t.region) === island) &&
        (!region || provinceLabel(t.region) === region) &&
        (!needle || `${t.name} ${t.region} ${t.tags.join(" ")}`.toLowerCase().includes(needle))
    );
  }, [trails, island, region, q]);
  const visible = inScope.filter((t) => matchesDifficulty(t, difficulty));

  // --- Real KPIs --------------------------------------------------------------
  const totalKm = trails.reduce((s, t) => s + (t.distanceKm || 0), 0);
  const danger = trails.filter((t) => t.advisoryLevel === "danger").length;
  const warning = trails.filter((t) => t.advisoryLevel === "warning").length;
  const pinned = trails.filter((t) => t.summitCoordinates).length;

  const counts = {
    all: inScope.length,
    easy: inScope.filter((t) => matchesDifficulty(t, "easy")).length,
    moderate: inScope.filter((t) => matchesDifficulty(t, "moderate")).length,
    hard: inScope.filter((t) => matchesDifficulty(t, "hard")).length,
  };
  const provinces = React.useMemo(() => {
    const m = new Map<string, number>();
    trails
      .filter((t) => island === "all" || islandOf(t.region) === island)
      .forEach((t) => m.set(provinceLabel(t.region), (m.get(provinceLabel(t.region)) ?? 0) + 1));
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [trails, island]);

  // --- Map selection ------------------------------------------------------------
  const [selected, setSelected] = React.useState<string | null>(null);
  React.useEffect(() => {
    if (!selected && trails.length) setSelected(trails.find((t) => t.slug === "rinjani")?.slug ?? trails[0].slug);
  }, [trails, selected]);
  const selectedTrail = trails.find((t) => t.slug === selected) ?? null;
  const [flash, setFlash] = React.useState<string | null>(null);
  const selectPin = (slug: string) => {
    setSelected(slug);
    setFlash(slug);
    document.getElementById(`trail-${slug}`)?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    window.setTimeout(() => setFlash((f) => (f === slug ? null : f)), 1800);
  };

  const unpinned = inScope.filter((t) => !t.summitCoordinates);

  return (
    <>
      {/* Hero + KPIs */}
      <section className="border-b bg-[#f7faf7]">
        <div className="container py-10 md:py-14">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-secondary px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-primary">
            Forest Guardian CSR <span className="text-primary/40">•</span> Trail Information System
          </div>
          <h1 className="font-display text-4xl font-semibold tracking-tight md:text-5xl">
            Find the right trail, prepared.
          </h1>
          <p className="mt-3 max-w-3xl text-muted-foreground">
            Distances, elevations, checkpoints, risk and live conditions in one field guide built for
            low-signal mountains.
          </p>

          <dl className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Kpi icon={Mountain} label="Active peaks" value={`${trails.length}`} unit="summits" />
            <Kpi icon={Compass} label="Total distance" value={totalKm.toFixed(1)} unit="km" />
            <Kpi
              icon={AlertTriangle}
              label="Active alerts"
              value={`${danger + warning}`}
              unit={`${danger} closed · ${warning} warning`}
              tone={danger ? "alert" : undefined}
            />
            <Kpi icon={MapPin} label="Summits on map" value={`${pinned}`} unit={`of ${trails.length} GPS-sourced`} />
          </dl>

          <OfflinePackPanel slugs={initialTrails.map((t) => t.slug)} className="mt-4" />
          {sim && (
            <div className="mt-3 flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900 ring-1 ring-amber-200">
              <WifiOff className="size-4" />
              {simError
                ? `Offline simulation: ${simError} Download the packs first.`
                : "Offline simulation: showing only what is saved on this device."}
            </div>
          )}
        </div>
      </section>

      {/* Filters */}
      <section className="container pt-8">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search volcano, island or peak"
              aria-label="Search trails"
              className="h-10 w-full rounded-lg border bg-card pl-9 pr-9 text-sm outline-none ring-ring focus-visible:ring-2"
            />
            {query && (
              <button
                aria-label="Clear search"
                onClick={() => setQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:bg-muted"
              >
                <X className="size-4" />
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {(
              [
                ["all", "All"],
                ["easy", "Easy"],
                ["moderate", "Moderate"],
                ["hard", "Hard / High risk"],
              ] as const
            ).map(([key, label]) => (
              <Chip key={key} active={difficulty === key} onClick={() => setParam("difficulty", key)}>
                {label} <span className="opacity-60">({counts[key]})</span>
              </Chip>
            ))}
            <Button
              variant={mapView ? "default" : "outline"}
              size="sm"
              className="h-8"
              onClick={() => setParam("view", mapView ? null : "map")}
            >
              <MapIcon /> Map split
            </Button>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {provinces.map(([p, n]) => (
            <button
              key={p}
              onClick={() => setParam("region", region === p ? null : p)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium ring-1 transition-colors",
                region === p
                  ? "bg-primary text-primary-foreground ring-primary"
                  : "bg-card text-foreground/75 ring-border hover:bg-secondary"
              )}
            >
              {p} <span className="opacity-60">{n}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Map */}
      <section className={cn("container pt-6", mapView && "lg:grid lg:grid-cols-5 lg:items-start lg:gap-6")}>
        <div className={cn("space-y-3", mapView && "lg:sticky lg:top-20 lg:col-span-3")}>
          <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Island">
            {ISLANDS.map((i) => {
              const n = i.id === "all" ? trails.length : trails.filter((t) => islandOf(t.region) === i.id).length;
              return (
                <button
                  key={i.id}
                  role="tab"
                  aria-selected={island === i.id}
                  onClick={() => setParams({ island: i.id, region: null })}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-xs font-semibold transition-colors",
                    island === i.id ? "bg-forest-900 text-white" : "bg-card text-foreground/70 ring-1 ring-border hover:bg-secondary"
                  )}
                >
                  {i.id === "all" ? "Archipelago all" : i.label} <span className="opacity-60">({n})</span>
                </button>
              );
            })}
          </div>
          <div className="relative">
            <ArchipelagoMap
              trails={inScope}
              island={island}
              selected={selected}
              onSelect={selectPin}
              className="aspect-[1000/530]"
            />
            {selectedTrail && <Inspector trail={selectedTrail} />}
          </div>
          {unpinned.length > 0 && (
            <p className="text-xs text-muted-foreground">
              Not on the map (no sourced summit coordinate yet):{" "}
              {unpinned.map((t) => t.name).join(", ")}.
            </p>
          )}
        </div>

        {/* Catalog */}
        <div className={cn("pt-8", mapView && "lg:col-span-2 lg:pt-0")}>
          <div className="mb-4 text-sm text-muted-foreground">
            Showing <strong className="text-foreground">{visible.length}</strong> of {trails.length} routes
          </div>
          {visible.length === 0 ? (
            <div className="rounded-xl border border-dashed p-12 text-center">
              <h3 className="font-display text-lg font-semibold">No trails match these filters.</h3>
              <p className="mt-1 text-sm text-muted-foreground">Clear a filter or pick another island.</p>
            </div>
          ) : (
            <div className={cn("grid gap-5 md:grid-cols-2", mapView ? "lg:grid-cols-1 xl:grid-cols-2" : "lg:grid-cols-3")}>
              {visible.map((t) => (
                <TrailCard key={t.slug} trail={t} highlighted={t.slug === flash} />
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
  unit,
  tone,
}: {
  icon: typeof Mountain;
  label: string;
  value: string;
  unit: string;
  tone?: "alert";
}) {
  return (
    <div className={cn("rounded-xl border bg-card p-4", tone === "alert" && "border-red-200 bg-red-50/60")}>
      <dt className={cn("flex items-center gap-1.5 text-xs font-medium text-muted-foreground", tone === "alert" && "text-red-700")}>
        <Icon className="size-3.5" /> {label}
      </dt>
      <dd className="mt-1 flex items-baseline gap-1.5">
        <span className={cn("font-mono text-2xl font-semibold tabular-nums", tone === "alert" && "text-red-700")}>{value}</span>
        <span className="text-xs text-muted-foreground">{unit}</span>
      </dd>
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "h-8 rounded-md px-3 text-xs font-semibold ring-1 transition-colors",
        active ? "bg-primary text-primary-foreground ring-primary" : "bg-card text-foreground/75 ring-border hover:bg-secondary"
      )}
    >
      {children}
    </button>
  );
}

function Inspector({ trail }: { trail: Trail }) {
  const headline = trail.advisories[0];
  return (
    <div className="absolute bottom-3 right-3 w-64 rounded-xl border bg-card/95 p-3 text-sm shadow-lg backdrop-blur max-sm:static max-sm:mt-3 max-sm:w-full">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{trail.region}</div>
          <div className="font-display font-semibold leading-tight">{trail.name}</div>
        </div>
        <AdvisoryBadge level={trail.advisoryLevel} />
      </div>
      <div className="mt-2 grid grid-cols-3 gap-1 font-mono text-xs tabular-nums">
        <div>
          <div className="text-[9px] uppercase text-muted-foreground">MASL</div>
          {trail.elevationM ? `${trail.elevationM.toLocaleString("en-US")} m` : "—"}
        </div>
        <div>
          <div className="text-[9px] uppercase text-muted-foreground">Route</div>
          {trail.distanceKm.toFixed(1)} km
        </div>
        <div>
          <div className="text-[9px] uppercase text-muted-foreground">Time</div>
          {formatMinutes(trail.estimatedMinutes)}
        </div>
      </div>
      {headline && <p className="mt-2 line-clamp-2 text-xs text-red-700">{headline.headline}</p>}
      <Button asChild size="sm" className="mt-3 w-full">
        <Link href={`/trails/${trail.slug}/telemetry`}>
          <Activity /> Open topo telemetry
        </Link>
      </Button>
    </div>
  );
}
