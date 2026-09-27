"use client";

import * as React from "react";
import geo from "@/lib/archipelago.json";
import { ISLANDS, type IslandId } from "@/lib/regions";
import type { Trail } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Indonesian archipelago with a pin per summit. Coastlines are Natural Earth
 * (1:50m) pre-projected to an equirectangular SVG path (lib/archipelago.json),
 * so the map needs no tile server and works offline. Pins use each trail's
 * sourced summit coordinates; trails without one are listed, not guessed.
 */

const K = (geo.scale * Math.PI) / 180;
export const project = (lng: number, lat: number): [number, number] => [
  lng * K + geo.translate[0],
  -lat * K + geo.translate[1],
];

function viewBoxFor(id: IslandId): [number, number, number, number] {
  const island = ISLANDS.find((i) => i.id === id) ?? ISLANDS[0];
  const [w, n, e, s] = island.bbox;
  const [x0, y0] = project(w, n);
  const [x1, y1] = project(e, s);
  return [x0, y0, x1 - x0, y1 - y0];
}

/** Tweens the SVG viewBox so island switches read as a pan/zoom. */
function useAnimatedViewBox(target: [number, number, number, number]) {
  const [vb, setVb] = React.useState(target);
  const from = React.useRef(target);
  React.useEffect(() => {
    const start = performance.now();
    const a = from.current;
    let raf = 0;
    const step = (t: number) => {
      const k = Math.min(1, (t - start) / 450);
      const e = 1 - Math.pow(1 - k, 3);
      const next = a.map((v, i) => v + (target[i] - v) * e) as typeof target;
      setVb(next);
      from.current = next;
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target.join(",")]);
  return vb;
}

const PIN_TONE = {
  danger: "fill-red-600",
  warning: "fill-amber-500",
  info: "fill-sky-500",
  none: "fill-primary",
} as const;

export function ArchipelagoMap({
  trails,
  island,
  selected,
  onSelect,
  className,
}: {
  trails: Trail[];
  island: IslandId;
  selected: string | null;
  onSelect: (slug: string) => void;
  className?: string;
}) {
  const vb = useAnimatedViewBox(viewBoxFor(island));
  const [hover, setHover] = React.useState<string | null>(null);
  // Pin size in map units stays constant on screen as we zoom.
  const unit = vb[2] / 1000;
  const pinned = trails.filter((t) => t.summitCoordinates);
  // Label every pin only when zoomed into a sparse island; dense views
  // (Java has 38 summits) label on hover/selection so names don't collide.
  const zoomed = island !== "all" && trails.filter((t) => t.summitCoordinates).length <= 12;

  return (
    <div className={cn("relative overflow-hidden rounded-2xl border bg-[#e2ede5]", className)}>
      <svg
        viewBox={vb.map((v) => v.toFixed(2)).join(" ")}
        className="block h-full w-full"
        role="img"
        aria-label="Map of Indonesian mountains"
      >
        <defs>
          <pattern id="graticule" width="50" height="50" patternUnits="userSpaceOnUse">
            <path d="M50 0H0V50" fill="none" stroke="#2d5a3d" strokeOpacity=".07" strokeWidth={unit} />
          </pattern>
        </defs>
        <rect x={0} y={0} width={geo.width} height={geo.height} fill="url(#graticule)" />
        <path d={geo.neighbours} fill="#2d5a3d" fillOpacity=".08" stroke="#2d5a3d" strokeOpacity=".15" strokeWidth={0.6 * unit} />
        <path d={geo.d} fill="#2d5a3d" fillOpacity=".22" stroke="#2d5a3d" strokeOpacity=".55" strokeWidth={0.8 * unit} />

        {pinned.map((t) => {
          const [x, y] = project(t.summitCoordinates!.lng, t.summitCoordinates!.lat);
          const isSel = t.slug === selected;
          const isHover = t.slug === hover;
          const r = (isSel ? 6 : 4.2) * unit;
          const tone = PIN_TONE[t.advisoryLevel ?? "none"];
          const showLabel = isSel || isHover || zoomed;
          return (
            <g
              key={t.slug}
              className="cursor-pointer"
              onClick={() => onSelect(t.slug)}
              onMouseEnter={() => setHover(t.slug)}
              onMouseLeave={() => setHover(null)}
              role="button"
              tabIndex={0}
              aria-label={`${t.name}${t.elevationM ? `, ${t.elevationM} m` : ""}`}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onSelect(t.slug)}
            >
              {isSel && (
                <circle cx={x} cy={y} r={r} className={tone} fillOpacity=".35">
                  <animate attributeName="r" from={r} to={r * 4} dur="1.6s" repeatCount="indefinite" />
                  <animate attributeName="fill-opacity" from=".4" to="0" dur="1.6s" repeatCount="indefinite" />
                </circle>
              )}
              {/* Larger invisible hit area for touch. */}
              <circle cx={x} cy={y} r={r * 2.4} fill="transparent" />
              <path
                d={`M${x} ${y - r * 1.6} L${x + r} ${y + r * 0.6} L${x - r} ${y + r * 0.6} Z`}
                className={tone}
                stroke="#fff"
                strokeWidth={0.9 * unit}
              />
              {showLabel && (
                <text
                  x={x + r * 1.5}
                  y={y + r * 0.4}
                  fontSize={11 * unit}
                  className="select-none fill-foreground font-semibold"
                  stroke="#f7faf7"
                  strokeWidth={3 * unit}
                  paintOrder="stroke"
                >
                  {t.name.replace(/\s*\(.*\)/, "")}
                  {t.elevationM ? ` ${t.elevationM.toLocaleString("en-US")}m` : ""}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      <div className="pointer-events-none absolute bottom-2 left-3 flex flex-wrap gap-3 text-[10px] font-medium text-foreground/70">
        <Legend tone="bg-primary" label="Open" />
        <Legend tone="bg-amber-500" label="Warning" />
        <Legend tone="bg-red-600" label="Closed / danger" />
      </div>
      <div className="pointer-events-none absolute right-3 top-2 font-mono text-[10px] text-foreground/50">
        WGS 84 · Natural Earth 1:50m
      </div>
    </div>
  );
}

function Legend({ tone, label }: { tone: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className={cn("size-2 rounded-sm", tone)} /> {label}
    </span>
  );
}
