import type { ProfilePoint } from "@/lib/telemetry";
import { formatMinutes, cn } from "@/lib/utils";

/**
 * Checkpoint log. Status is relative to the position shown on the profile
 * (live GPS altitude or the demo position); with no position everything is
 * "Ahead". Elevations appear only where the source names them.
 */
export function CheckpointTable({
  points,
  currentKm,
  water,
  night,
}: {
  points: ProfilePoint[];
  currentKm: number | null;
  water: string | null;
  night?: boolean;
}) {
  const nextIdx = currentKm == null ? -1 : points.findIndex((p) => p.km > currentKm + 0.05);

  return (
    <div className={cn("overflow-hidden rounded-xl border", night ? "border-hud-line" : "bg-card")}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className={cn("text-left text-[11px] uppercase tracking-wider", night ? "bg-hud-800 text-emerald-100/60" : "bg-muted/60 text-muted-foreground")}>
            <tr>
              <th className="px-3 py-2 font-semibold">#</th>
              <th className="px-3 py-2 font-semibold">Waypoint</th>
              <th className="px-3 py-2 text-right font-semibold">km</th>
              <th className="px-3 py-2 text-right font-semibold">Altitude</th>
              <th className="px-3 py-2 text-right font-semibold">Guide ETA</th>
              <th className="px-3 py-2 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody className={cn("divide-y font-mono tabular-nums", night && "divide-hud-line")}>
            {points.map((p, i) => {
              const status =
                currentKm == null ? "Ahead" : i === nextIdx ? "Next" : p.km <= currentKm + 0.05 ? "Passed" : "Ahead";
              return (
                <tr key={`${p.name}-${i}`} className={cn(status === "Next" && (night ? "bg-telemetry/10" : "bg-secondary/60"))}>
                  <td className="px-3 py-2 text-xs opacity-60">{i === 0 ? "S" : i}</td>
                  <td className="px-3 py-2 font-sans font-medium">{p.name}</td>
                  <td className="px-3 py-2 text-right">{p.km.toFixed(1)}</td>
                  <td className="px-3 py-2 text-right">{p.elevationM != null ? `${p.elevationM.toLocaleString("en-US")} m` : "—"}</td>
                  <td className="px-3 py-2 text-right">{p.etaMin != null ? formatMinutes(p.etaMin) : "—"}</td>
                  <td className="px-3 py-2 font-sans">
                    <span
                      className={cn(
                        "rounded px-1.5 py-0.5 text-[11px] font-semibold",
                        status === "Passed" && (night ? "bg-hud-800 text-emerald-100/50" : "bg-muted text-muted-foreground"),
                        status === "Next" && "bg-primary text-primary-foreground",
                        status === "Ahead" && (night ? "text-emerald-100/70" : "text-foreground/70")
                      )}
                    >
                      {status}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {water && (
        <p className={cn("border-t px-3 py-2 text-xs", night ? "border-hud-line text-emerald-100/70" : "text-muted-foreground")}>
          <span className="font-semibold">Water:</span> {water}
        </p>
      )}
    </div>
  );
}
