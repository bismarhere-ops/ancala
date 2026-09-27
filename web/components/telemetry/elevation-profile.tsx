import type { ProfilePoint } from "@/lib/telemetry";
import { elevationAt } from "@/lib/telemetry";
import { cn } from "@/lib/utils";

/**
 * Ascent cross-section. The line joins only the points whose elevation the
 * source gives (unknown checkpoints are ticked on the axis but not plotted),
 * so the curve never implies terrain we haven't got.
 */
export function ElevationProfile({
  points,
  ascentKm,
  markerKm,
  markerLabel,
  demo,
  night,
  compact,
  className,
}: {
  points: ProfilePoint[];
  ascentKm: number;
  markerKm?: number | null;
  markerLabel?: string;
  demo?: boolean;
  night?: boolean;
  compact?: boolean;
  className?: string;
}) {
  const W = 600;
  const H = compact ? 110 : 190;
  const pad = { l: compact ? 6 : 44, r: 10, t: compact ? 14 : 18, b: compact ? 8 : 26 };
  const plotted = points.filter((p) => p.elevationM != null) as (ProfilePoint & { elevationM: number })[];

  if (plotted.length < 2) {
    return (
      <div className={cn("flex items-center justify-center rounded-lg border border-dashed p-6 text-center text-xs", night ? "border-hud-line text-emerald-100/60" : "text-muted-foreground", className)}>
        No sourced checkpoint elevations for this trail yet, so no profile is drawn.
      </div>
    );
  }

  const lo = Math.min(...plotted.map((p) => p.elevationM));
  const hi = Math.max(...plotted.map((p) => p.elevationM));
  const span = Math.max(100, hi - lo);
  const x = (km: number) => pad.l + (km / (ascentKm || 1)) * (W - pad.l - pad.r);
  const y = (m: number) => pad.t + (1 - (m - lo) / span) * (H - pad.t - pad.b);

  const line = plotted.map((p, i) => `${i ? "L" : "M"}${x(p.km).toFixed(1)} ${y(p.elevationM).toFixed(1)}`).join(" ");
  const area = `${line} L${x(plotted[plotted.length - 1].km)} ${H - pad.b} L${x(plotted[0].km)} ${H - pad.b} Z`;
  const stroke = night ? "#22c55e" : "#2d5a3d";
  const text = night ? "fill-emerald-100/70" : "fill-muted-foreground";
  const markerAlt = markerKm != null ? elevationAt(points, markerKm) : null;
  const markerColor = demo ? "#f59e0b" : night ? "#22c55e" : "#dc2626";

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={cn("w-full", className)} role="img" aria-label="Elevation profile of the ascent">
      <defs>
        <linearGradient id={`fill-${night ? "n" : "d"}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor={stroke} stopOpacity=".35" />
          <stop offset="1" stopColor={stroke} stopOpacity=".03" />
        </linearGradient>
      </defs>

      {!compact &&
        [lo, lo + span / 2, lo + span].map((m) => (
          <g key={m}>
            <line x1={pad.l} x2={W - pad.r} y1={y(m)} y2={y(m)} stroke={stroke} strokeOpacity=".12" />
            <text x={pad.l - 6} y={y(m) + 3} textAnchor="end" fontSize="10" className={text}>
              {Math.round(m).toLocaleString("en-US")}
            </text>
          </g>
        ))}

      <path d={area} fill={`url(#fill-${night ? "n" : "d"})`} />
      <path d={line} fill="none" stroke={stroke} strokeWidth="2.2" strokeLinejoin="round" />

      {points.map((p) => {
        const px = x(p.km);
        return (
          <g key={`${p.name}-${p.km}`}>
            {p.elevationM != null ? (
              <circle cx={px} cy={y(p.elevationM)} r="3" fill={night ? "#0e1813" : "#fff"} stroke={stroke} strokeWidth="1.5" />
            ) : (
              <line x1={px} x2={px} y1={H - pad.b - 4} y2={H - pad.b} stroke={stroke} strokeOpacity=".5" />
            )}
            {!compact && p.elevationM != null && (
              <text
                x={px}
                y={y(p.elevationM) - 7}
                textAnchor={px > W - 70 ? "end" : px < pad.l + 40 ? "start" : "middle"}
                fontSize="9.5"
                className={text}
              >
                {p.name.replace(/\s*\(.*\)/, "")}
              </text>
            )}
          </g>
        );
      })}

      {markerKm != null && markerAlt != null && (
        <g>
          <line x1={x(markerKm)} x2={x(markerKm)} y1={pad.t - 6} y2={H - pad.b} stroke={markerColor} strokeDasharray="3 3" />
          <circle cx={x(markerKm)} cy={y(markerAlt)} r="5" fill={markerColor} stroke="#fff" strokeWidth="1.5">
            <animate attributeName="r" values="5;7;5" dur="1.6s" repeatCount="indefinite" />
          </circle>
          {markerLabel && (
            <text
              x={Math.min(x(markerKm) + 8, W - 150)}
              y={pad.t}
              fontSize="10.5"
              fontWeight="600"
              fill={markerColor}
            >
              {markerLabel}
            </text>
          )}
        </g>
      )}

      {!compact && (
        <text x={W - pad.r} y={H - 6} textAnchor="end" fontSize="10" className={text}>
          {ascentKm.toFixed(1)} km to summit
        </text>
      )}
    </svg>
  );
}
