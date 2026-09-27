"use client";

import * as React from "react";
import type * as L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Crosshair, Layers, Minus, Plus } from "lucide-react";
import type { Coordinates } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Real topographic map: OpenTopoMap tiles (contours from SRTM elevation data)
 * with the summit, basecamp (when sourced) and the hiker's live GPS position.
 * Trail lines are not drawn: we don't have surveyed track geometry yet, and a
 * straight line between checkpoints would be a guess.
 */

const LAYERS = {
  topo: {
    label: "Topo",
    url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
    attribution:
      'Map data © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>, SRTM · Style © <a href="https://opentopomap.org">OpenTopoMap</a> (CC-BY-SA)',
    maxZoom: 17,
  },
  street: {
    label: "Street",
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: 'Map data © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 19,
  },
} as const;

type LayerKey = keyof typeof LAYERS;

export interface TopoMapProps {
  summit: Coordinates | null;
  summitLabel: string;
  basecamp?: Coordinates | null;
  /** Live GPS position (or the simulated demo position). */
  position?: (Coordinates & { accuracy?: number }) | null;
  positionIsDemo?: boolean;
  night?: boolean;
  className?: string;
}

function pinIcon(Lf: typeof L, html: string) {
  return Lf.divIcon({ html, className: "", iconSize: [0, 0] });
}

export function TopoMap({ summit, summitLabel, basecamp, position, positionIsDemo, night, className }: TopoMapProps) {
  const el = React.useRef<HTMLDivElement>(null);
  const map = React.useRef<L.Map | null>(null);
  const Lref = React.useRef<typeof L | null>(null);
  const tiles = React.useRef<L.TileLayer | null>(null);
  const me = React.useRef<{ dot: L.Marker; ring: L.Circle } | null>(null);
  const [layer, setLayer] = React.useState<LayerKey>("topo");
  const [ready, setReady] = React.useState(false);

  // Create the map once (Leaflet touches `window`, so load it in the browser).
  React.useEffect(() => {
    let cancelled = false;
    import("leaflet").then((Lf) => {
      if (cancelled || !el.current || map.current) return;
      Lref.current = Lf;
      const center = summit ?? basecamp ?? { lat: -7.5, lng: 110 };
      const m = Lf.map(el.current, { zoomControl: false, attributionControl: true }).setView(
        [center.lat, center.lng],
        summit ? 13 : 6
      );
      Lf.control.scale({ metric: true, imperial: false, position: "bottomleft" }).addTo(m);
      if (summit) {
        Lf.marker([summit.lat, summit.lng], {
          icon: pinIcon(
            Lf,
            `<div style="transform:translate(-50%,-100%);display:flex;flex-direction:column;align-items:center">
               <div style="background:#152e1f;color:#fff;font:600 11px system-ui;padding:2px 6px;border-radius:4px;white-space:nowrap">${summitLabel}</div>
               <div style="width:0;height:0;border-left:7px solid transparent;border-right:7px solid transparent;border-top:10px solid #152e1f"></div>
             </div>`
          ),
        }).addTo(m);
      }
      if (basecamp) {
        Lf.marker([basecamp.lat, basecamp.lng], {
          icon: pinIcon(
            Lf,
            `<div style="transform:translate(-50%,-50%);background:#2d5a3d;color:#fff;font:600 10px system-ui;padding:2px 5px;border-radius:4px">Basecamp</div>`
          ),
        }).addTo(m);
      }
      map.current = m;
      setReady(true);
    });
    return () => {
      cancelled = true;
      map.current?.remove();
      map.current = null;
    };
    // Summit/basecamp are fixed for a page; recreating the map would reset the view.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Tile layer.
  React.useEffect(() => {
    const Lf = Lref.current;
    const m = map.current;
    if (!ready || !Lf || !m) return;
    tiles.current?.remove();
    const cfg = LAYERS[layer];
    tiles.current = Lf.tileLayer(cfg.url, { attribution: cfg.attribution, maxZoom: cfg.maxZoom, subdomains: "abc" }).addTo(m);
  }, [layer, ready]);

  // Live / demo position.
  React.useEffect(() => {
    const Lf = Lref.current;
    const m = map.current;
    if (!ready || !Lf || !m) return;
    if (!position) {
      me.current?.dot.remove();
      me.current?.ring.remove();
      me.current = null;
      return;
    }
    const color = positionIsDemo ? "#f59e0b" : "#22c55e";
    const html = `<div style="transform:translate(-50%,-50%);width:14px;height:14px;border-radius:50%;background:${color};border:2px solid #fff;box-shadow:0 0 0 6px ${color}55"></div>`;
    if (!me.current) {
      me.current = {
        dot: Lf.marker([position.lat, position.lng], { icon: pinIcon(Lf, html) }).addTo(m),
        ring: Lf.circle([position.lat, position.lng], {
          radius: position.accuracy ?? 0,
          color,
          weight: 1,
          fillOpacity: 0.12,
        }).addTo(m),
      };
    } else {
      me.current.dot.setLatLng([position.lat, position.lng]);
      me.current.dot.setIcon(pinIcon(Lf, html));
      me.current.ring.setLatLng([position.lat, position.lng]).setRadius(position.accuracy ?? 0);
    }
  }, [position, positionIsDemo, ready]);

  const recenter = () => {
    const target = position ?? summit;
    if (target) map.current?.setView([target.lat, target.lng], Math.max(map.current.getZoom(), 14));
  };

  return (
    <div className={cn("relative overflow-hidden", className)}>
      <div
        ref={el}
        className={cn("absolute inset-0 z-0", night &&
            "bg-hud-950 [&.leaflet-container]:bg-hud-950 [&_.leaflet-tile-pane]:[filter:invert(1)_hue-rotate(180deg)_brightness(0.85)_saturate(0.6)]")}
        aria-label={`Topographic map around ${summitLabel}`}
      />

      {/* Controls */}
      <div className="absolute right-3 top-3 z-[400] flex flex-col gap-1.5">
        <MapButton label="Zoom in" onClick={() => map.current?.zoomIn()} night={night}>
          <Plus className="size-4" />
        </MapButton>
        <MapButton label="Zoom out" onClick={() => map.current?.zoomOut()} night={night}>
          <Minus className="size-4" />
        </MapButton>
        <MapButton label={position ? "Center on me" : "Center on summit"} onClick={recenter} night={night}>
          <Crosshair className="size-4" />
        </MapButton>
        <MapButton
          label={`Switch to ${layer === "topo" ? "street" : "topo"} map`}
          onClick={() => setLayer((l) => (l === "topo" ? "street" : "topo"))}
          night={night}
        >
          <Layers className="size-4" />
        </MapButton>
      </div>

      {/* Compass rose (map is north-up) */}
      <div
        className={cn(
          "pointer-events-none absolute bottom-8 right-3 z-[400] flex size-11 flex-col items-center justify-center rounded-full font-mono text-[10px] font-bold shadow",
          night ? "bg-hud-900/85 text-telemetry" : "bg-white/90 text-forest-900"
        )}
        aria-hidden
      >
        <span className="leading-none">N</span>
        <span className="leading-none">▲</span>
      </div>
      <div
        className={cn(
          "pointer-events-none absolute left-3 top-3 z-[400] rounded px-1.5 py-0.5 font-mono text-[10px]",
          night ? "bg-hud-900/80 text-telemetry" : "bg-white/85 text-forest-900"
        )}
      >
        {LAYERS[layer].label} · WGS 84 · contours SRTM
      </div>
    </div>
  );
}

function MapButton({
  label,
  onClick,
  night,
  children,
}: {
  label: string;
  onClick: () => void;
  night?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={cn(
        "flex size-9 items-center justify-center rounded-md shadow ring-1",
        night ? "bg-hud-900/90 text-telemetry ring-hud-line hover:bg-hud-800" : "bg-white text-forest-900 ring-black/10 hover:bg-secondary"
      )}
    >
      {children}
    </button>
  );
}
