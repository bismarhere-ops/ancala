import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { ImpactResponse } from "@/lib/types";
import { formatNumber } from "@/lib/utils";

// Simple monotonically-mapped target for the progress bar per metric.
const TARGETS: Record<string, number> = {
  trees_planted: 60_000,
  active_guardians: 2_000,
  waste_collected: 18_000,
  trails_protected: 100,
  bootcamp_graduates: 650,
  partner_ngos: 60,
};

export function ImpactStats({ impact }: { impact: ImpactResponse }) {
  const metrics = impact.data.metrics;
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {metrics.map((m) => {
        const target = TARGETS[m.key] || Math.max(100, m.value * 1.3);
        const pct = Math.min(100, Math.round((m.value / target) * 100));
        return (
          <Card key={m.key} className="p-6">
            <div className="font-display text-3xl font-semibold tracking-tight">
              {formatNumber(m.value)}
              {m.unit === "kg" && <span className="ml-1 text-base text-muted-foreground">kg</span>}
            </div>
            <div className="mt-1 text-sm font-medium text-foreground/80">{m.label}</div>
            <div className="mt-4">
              <Progress value={pct} />
              <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                <span>{pct}% of {formatNumber(target)}</span>
                <span>Goal</span>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
