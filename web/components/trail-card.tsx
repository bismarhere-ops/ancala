import Image from "next/image";
import Link from "next/link";
import { Activity, ArrowUpRight, Clock, Mountain, Route } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Trail } from "@/lib/types";
import { AccessBadge } from "@/components/access-banner";
import { AdvisoryBadge } from "@/components/advisory-banner";
import { MountainArt } from "@/components/mountain-art";
import { isLowReliability } from "@/lib/access";
import { coverFor } from "@/lib/cover-photos";
import { cn, difficultyColor, formatMinutes, riskColor } from "@/lib/utils";

export function TrailCard({
  trail,
  compact = false,
  highlighted = false,
}: {
  trail: Trail;
  compact?: boolean;
  highlighted?: boolean;
}) {
  const cover = coverFor(trail.slug, trail.coverImage);

  return (
    <Card
      id={`trail-${trail.slug}`}
      className={cn(
        "group relative h-full scroll-mt-28 overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-md",
        highlighted && "ring-2 ring-primary ring-offset-2"
      )}
    >
      <div
        className={cn(
          "relative flex items-end bg-forest-700 bg-topo p-5 text-white",
          compact ? "h-28" : "h-40"
        )}
      >
        {cover ? (
          <>
            <Image
              src={cover.src}
              alt=""
              fill
              sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
              className="object-cover"
            />
            {/* Keeps white text readable over bright photos. */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
            {cover.credit && (
              <span className="absolute bottom-1 right-2 max-w-[70%] truncate text-[9px] text-white/60">{cover.credit}</span>
            )}
          </>
        ) : (
          <MountainArt slug={trail.slug} elevationGainM={trail.elevationGainM} />
        )}
        <div className="relative">
          <div className="text-[11px] uppercase tracking-wider text-forest-100/80">{trail.region}</div>
          <div className="font-display text-lg font-semibold leading-tight">{trail.name}</div>
        </div>
        {trail.elevationM != null && (
          <span className="absolute right-3 top-3 rounded-md bg-black/45 px-2 py-0.5 font-mono text-xs font-semibold tabular-nums backdrop-blur">
            {trail.elevationM.toLocaleString("en-US")} m
          </span>
        )}
        <span className="absolute left-4 top-3 flex flex-wrap gap-1.5">
          <AdvisoryBadge level={trail.advisoryLevel} />
          <AccessBadge status={trail.accessStatus} />
        </span>
      </div>

      <CardHeader className={compact ? "pb-2" : undefined}>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className={cn("capitalize", difficultyColor(trail.difficulty))}>
            {trail.difficulty}
          </Badge>
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <span className={cn("size-1.5 rounded-full", riskColor(trail.risk))} />
            {trail.risk} risk
          </span>
          {isLowReliability(trail.dataReliabilityTier) && (
            <span className="text-xs italic text-muted-foreground/70">unverified data</span>
          )}
        </div>
        {!compact && <CardDescription className="line-clamp-2">{trail.summary}</CardDescription>}
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-2 text-sm">
          <Stat icon={Route} value={`${trail.distanceKm.toFixed(1)} km`} label="Distance" />
          <Stat icon={Mountain} value={trail.elevationGainM ? `+${trail.elevationGainM} m` : "—"} label="Gain" />
          <Stat icon={Clock} value={formatMinutes(trail.estimatedMinutes)} label="Est. time" />
        </div>
        {!compact && (
          <div className="flex items-center justify-between border-t pt-3 text-sm">
            <span className="inline-flex items-center gap-1 font-medium text-foreground/80">
              Details <ArrowUpRight className="size-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </span>
            <Link
              href={`/trails/${trail.slug}/telemetry`}
              className="relative z-10 inline-flex items-center gap-1.5 rounded-md bg-secondary px-2.5 py-1 text-xs font-semibold text-primary hover:bg-secondary/70"
            >
              <Activity className="size-3.5" /> Open telemetry
            </Link>
          </div>
        )}
      </CardContent>

      {/* Whole-card link; the telemetry link above sits on top of it. */}
      <Link href={`/trails/${trail.slug}`} className="absolute inset-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <span className="sr-only">View {trail.name}</span>
      </Link>
    </Card>
  );
}

function Stat({ icon: Icon, value, label }: { icon: typeof Route; value: string; label: string }) {
  return (
    <div>
      <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground">
        <Icon className="size-3" /> {label}
      </div>
      <div className="font-mono font-semibold tabular-nums">{value}</div>
    </div>
  );
}
