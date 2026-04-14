import Link from "next/link";
import { ArrowUpRight, Clock, Mountain, Route } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Trail } from "@/lib/types";
import { cn, difficultyColor, formatMinutes, riskColor } from "@/lib/utils";

export function TrailCard({ trail, compact = false }: { trail: Trail; compact?: boolean }) {
  return (
    <Link href={`/trails/${trail.slug}`} className="group focus:outline-none">
      <Card className="h-full overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-md group-focus-visible:ring-2 group-focus-visible:ring-ring">
        <div
          className={cn(
            "relative flex items-end bg-forest-700 bg-topo p-5 text-white",
            compact ? "h-28" : "h-36"
          )}
        >
          <div>
            <div className="text-[11px] uppercase tracking-wider text-forest-100/80">
              {trail.region}
            </div>
            <div className="font-display text-lg font-semibold leading-tight">
              {trail.name}
            </div>
          </div>
          <ArrowUpRight className="absolute right-4 top-4 size-5 opacity-70 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </div>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className={cn("capitalize", difficultyColor(trail.difficulty))}>
              {trail.difficulty}
            </Badge>
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <span className={cn("size-1.5 rounded-full", riskColor(trail.risk))} />
              {trail.risk} risk
            </span>
          </div>
          {!compact && (
            <CardDescription className="line-clamp-2">{trail.summary}</CardDescription>
          )}
        </CardHeader>
        <CardContent className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Route className="size-4" />
            {trail.distanceKm.toFixed(1)} km
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Mountain className="size-4" />
            {trail.elevationGainM} m
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Clock className="size-4" />
            {formatMinutes(trail.estimatedMinutes)}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
