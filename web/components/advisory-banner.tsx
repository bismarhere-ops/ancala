import {
  AlertTriangle,
  Ban,
  CloudRain,
  Flame,
  Mountain,
  Waves,
} from "lucide-react";
import type { Advisory, AdvisorySeverity, AdvisoryType } from "@/lib/types";

const TYPE_ICON: Record<AdvisoryType, React.ComponentType<{ className?: string }>> = {
  fire: Flame,
  flood: Waves,
  landslide: Mountain,
  volcanic: Flame,
  weather: CloudRain,
  earthquake: AlertTriangle,
  closure: Ban,
  other: AlertTriangle,
};

// Each severity carries its own colour token set, defined here once.
const SEVERITY_STYLE: Record<
  AdvisorySeverity,
  { box: string; icon: string; label: string }
> = {
  danger: {
    box: "border-red-300 bg-red-50 text-red-900",
    icon: "text-red-600",
    label: "Danger",
  },
  warning: {
    box: "border-amber-300 bg-amber-50 text-amber-900",
    icon: "text-amber-600",
    label: "Warning",
  },
  info: {
    box: "border-blue-300 bg-blue-50 text-blue-900",
    icon: "text-blue-600",
    label: "Notice",
  },
};

function dateRange(a: Advisory) {
  if (!a.effectiveFrom && !a.effectiveUntil) return null;
  const from = a.effectiveFrom ?? "?";
  return a.effectiveUntil ? `${from} → ${a.effectiveUntil}` : `since ${from}`;
}

/** Full advisory cards — used on trail detail and inside the planner. */
export function AdvisoryBanner({ advisories }: { advisories: Advisory[] }) {
  if (!advisories || advisories.length === 0) return null;

  return (
    <div className="space-y-3" role="alert">
      {advisories.map((a) => {
        const style = SEVERITY_STYLE[a.severity];
        const Icon = TYPE_ICON[a.type] ?? AlertTriangle;
        const range = dateRange(a);
        return (
          <div key={a.id} className={`rounded-xl border p-4 ${style.box}`}>
            <div className="flex items-start gap-3">
              <Icon className={`mt-0.5 size-5 shrink-0 ${style.icon}`} />
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="text-[11px] font-semibold uppercase tracking-wider">
                    {style.label} · {a.type}
                  </span>
                  {range && <span className="text-xs opacity-70">{range}</span>}
                </div>
                <div className="mt-0.5 font-display text-sm font-semibold">{a.headline}</div>
                {a.detail && <p className="mt-1 text-sm opacity-90">{a.detail}</p>}
                {a.source && (
                  <p className="mt-1 text-xs opacity-70">Source: {a.source}</p>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** Compact corner badge for trail cards. Renders nothing when no advisory. */
export function AdvisoryBadge({ level }: { level: AdvisorySeverity | null }) {
  if (!level || level === "info") return null;
  const danger = level === "danger";
  return (
    <span
      className={
        danger
          ? "rounded-full bg-red-600 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-white"
          : "rounded-full bg-amber-500 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-amber-950"
      }
    >
      {danger ? "Alert" : "Advisory"}
    </span>
  );
}
