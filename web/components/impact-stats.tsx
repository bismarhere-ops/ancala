import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import type { ImpactMetric, ImpactResponse } from "@/lib/types";
import { formatNumber } from "@/lib/utils";

function MetricCard({ metric }: { metric: ImpactMetric }) {
  const { value, target, label, unit, kind } = metric;
  const pct = target && target > 0 ? Math.min(100, Math.round((value / target) * 100)) : 0;
  const notStarted = kind === "reported" && value === 0;

  return (
    <Card className="p-6">
      <div className="flex items-start justify-between gap-2">
        <div className="font-display text-3xl font-semibold tracking-tight">
          {notStarted ? (
            <span className="text-muted-foreground/60">—</span>
          ) : (
            <>
              {formatNumber(value)}
              {unit === "kg" && <span className="ml-1 text-base text-muted-foreground">kg</span>}
            </>
          )}
        </div>
        <Badge variant={kind === "measured" ? "secondary" : "outline"} className="shrink-0 text-[10px]">
          {kind === "measured" ? "Measured" : "Goal"}
        </Badge>
      </div>

      <div className="mt-1 text-sm font-medium text-foreground/80">{label}</div>

      {notStarted ? (
        <div className="mt-4 text-xs text-muted-foreground">
          Not yet recorded · target {formatNumber(target ?? 0)}
        </div>
      ) : (
        <div className="mt-4">
          <Progress value={pct} />
          <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {pct}% of {formatNumber(target ?? 0)}
            </span>
            <span>Target</span>
          </div>
        </div>
      )}
    </Card>
  );
}

export function ImpactStats({ impact }: { impact: ImpactResponse }) {
  const metrics = impact.data.metrics;
  const hasReported = metrics.some((m) => m.kind === "reported" && m.value === 0);

  return (
    <div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {metrics.map((m) => (
          <MetricCard key={m.key} metric={m} />
        ))}
      </div>
      {hasReported && (
        <p className="mt-4 text-xs text-muted-foreground">
          Figures marked <span className="font-medium">Measured</span> are computed directly from
          platform data. Those marked <span className="font-medium">Goal</span> are programme targets
          with no results recorded yet — we publish them as commitments, not achievements.
        </p>
      )}
    </div>
  );
}
