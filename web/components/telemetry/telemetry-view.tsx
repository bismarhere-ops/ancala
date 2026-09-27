"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  BatteryMedium,
  Compass,
  Download,
  Gauge,
  List,
  MapPin,
  Mountain,
  Navigation,
  OctagonAlert,
  Route,
  Timer,
  TrendingUp,
  UserRound,
  WifiOff,
  Wind,
} from "lucide-react";
import { TopoMap } from "@/components/telemetry/topo-map";
import { ElevationProfile } from "@/components/telemetry/elevation-profile";
import { CheckpointTable } from "@/components/telemetry/checkpoint-table";
import { SosButton } from "@/components/sos-button";
import { Button } from "@/components/ui/button";
import { recentGrade, useGps } from "@/lib/use-gps";
import { usePackMeta } from "@/lib/offline";
import { bearingDeg, compassPoint, distanceKm, formatCoords } from "@/lib/geo";
import {
  ascentProfile,
  demoReadout,
  fmtEta,
  fmtPace,
  liveReadout,
  nextCheckpoint,
  type TelemetryReadout,
} from "@/lib/telemetry";
import type { Coordinates, Trail, WeatherResponse } from "@/lib/types";
import { cn } from "@/lib/utils";

const HIGH_WIND_KPH = 40;

function useMediaQuery(q: string) {
  const [match, setMatch] = React.useState<boolean | null>(null);
  React.useEffect(() => {
    const mq = window.matchMedia(q);
    const update = () => setMatch(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, [q]);
  return match;
}

function useNow(active: boolean, ms = 5000) {
  const [now, setNow] = React.useState(() => Date.now());
  React.useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(id);
  }, [active, ms]);
  return now;
}

function useBattery() {
  const [level, setLevel] = React.useState<number | null>(null);
  React.useEffect(() => {
    const nav = navigator as Navigator & { getBattery?: () => Promise<{ level: number; addEventListener: (e: string, f: () => void) => void }> };
    nav.getBattery?.().then((b) => {
      setLevel(b.level);
      b.addEventListener("levelchange", () => setLevel(b.level));
    }).catch(() => {});
  }, []);
  return level;
}

interface Waypoint {
  lat: number;
  lng: number;
  altitude: number | null;
  t: number;
}

function useWaypoints(slug: string) {
  const key = `fg-waypoints-${slug}`;
  const [list, setList] = React.useState<Waypoint[]>([]);
  React.useEffect(() => {
    try {
      setList(JSON.parse(localStorage.getItem(key) || "[]"));
    } catch {
      /* ignore */
    }
  }, [key]);
  const add = (w: Waypoint) =>
    setList((l) => {
      const next = [...l, w];
      try {
        localStorage.setItem(key, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  return { list, add };
}

export function TelemetryView({ trail, weather }: { trail: Trail; weather: WeatherResponse | null }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const demo = params.get("demo") === "1";
  const setDemo = (on: boolean) => router.replace(on ? `${pathname}?demo=1` : pathname, { scroll: false });

  const [tracking, setTracking] = React.useState(false);
  const gps = useGps(tracking && !demo);
  const now = useNow(tracking && !demo);
  const elapsedMin = gps.startedAt ? (now - gps.startedAt) / 60000 : 0;
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const waypoints = useWaypoints(trail.slug);

  const { points, ascentKm, partial } = React.useMemo(() => ascentProfile(trail), [trail]);
  const readout: TelemetryReadout = demo
    ? demoReadout(trail)
    : liveReadout(trail, {
        altitude: gps.fix?.altitude ?? null,
        distanceKm: gps.distanceKm,
        gainM: gps.gainM,
        elapsedMin,
        gradePct: recentGrade(gps.recent),
      });

  const summit = trail.summitCoordinates;
  const basecamp = trail.profile?.basecamp.coordinates ?? null;
  // Demo dot: straight-line fraction from basecamp to summit, only when both are sourced.
  const demoPos: Coordinates | null =
    demo && summit && basecamp
      ? {
          lat: basecamp.lat + (summit.lat - basecamp.lat) * 0.613,
          lng: basecamp.lng + (summit.lng - basecamp.lng) * 0.613,
        }
      : null;
  const livePos = !demo && gps.fix ? { lat: gps.fix.lat, lng: gps.fix.lng, accuracy: gps.fix.accuracy } : null;
  const position = demo ? demoPos : livePos;

  const bearing = position && summit ? bearingDeg(position, summit) : null;
  const straightKm = position && summit ? distanceKm(position, summit) : null;
  const next = readout.profileKm != null ? nextCheckpoint(points, readout.profileKm) : null;

  const wind = weather?.data.current.windKph ?? null;
  const temp = weather?.data.current.tempC ?? null;
  const weatherMock = weather ? /mock/i.test(weather.data.source) : false;
  const closed = !trail.plannable;

  const shared: Shared = {
    trail,
    demo,
    setDemo,
    tracking,
    setTracking,
    gps,
    readout,
    points,
    ascentKm,
    partial,
    summit,
    basecamp,
    position,
    bearing,
    straightKm,
    next,
    wind,
    temp,
    weatherMock,
    closed,
    waypoints,
    elapsedMin,
  };

  if (isDesktop === null) return <div className="min-h-[70vh]" />;
  return isDesktop ? <Workstation {...shared} /> : <FieldHud {...shared} />;
}

interface Shared {
  trail: Trail;
  demo: boolean;
  setDemo: (on: boolean) => void;
  tracking: boolean;
  setTracking: (on: boolean) => void;
  gps: ReturnType<typeof useGps>;
  readout: TelemetryReadout;
  points: ReturnType<typeof ascentProfile>["points"];
  ascentKm: number;
  partial: boolean;
  summit: Coordinates | null;
  basecamp: Coordinates | null;
  position: (Coordinates & { accuracy?: number }) | null;
  bearing: number | null;
  straightKm: number | null;
  next: ReturnType<typeof nextCheckpoint>;
  wind: number | null;
  temp: number | null;
  weatherMock: boolean;
  closed: boolean;
  waypoints: ReturnType<typeof useWaypoints>;
  elapsedMin: number;
}

// --- Shared bits ---------------------------------------------------------------

function metrics(s: Shared) {
  const r = s.readout;
  const m = (v: number | null, unit = " m") => (v == null ? "—" : `${Math.round(v).toLocaleString("en-US")}${unit}`);
  return [
    {
      icon: Mountain,
      label: "Altitude",
      value: m(r.altitudeM),
      sub: r.toSummitM != null ? `+${Math.round(r.toSummitM).toLocaleString("en-US")} m to summit` : s.demo ? "" : "No altitude from device yet",
    },
    {
      icon: Route,
      label: s.demo ? "Distance" : "Walked",
      value: r.progressKm == null ? "—" : `${r.progressKm.toFixed(1)}${s.demo ? ` / ${r.ascentKm.toFixed(1)}` : ""} km`,
      sub: s.demo ? "along the ascent" : "this session",
    },
    {
      icon: TrendingUp,
      label: "Grade",
      value: r.gradePct == null ? "—" : `${r.gradePct >= 0 ? "+" : ""}${Math.round(r.gradePct)}%`,
      sub: s.demo ? "profile at position" : "last 40+ m",
    },
    { icon: Activity, label: "Vertical gain", value: r.gainM == null ? "—" : `+${Math.round(r.gainM).toLocaleString("en-US")} m`, sub: s.demo ? "from start" : "this session" },
    { icon: Gauge, label: "Pace", value: `${fmtPace(r.paceMinPerKm)}`, sub: "min / km" },
    { icon: Timer, label: "ETA summit", value: fmtEta(r.etaMin), sub: r.etaBasis ? `by ${r.etaBasis}` : "needs a position" },
  ];
}

function climbFraction(s: Shared) {
  const r = s.readout;
  if (s.demo) return r.progressKm != null ? r.progressKm / r.ascentKm : null;
  const start = s.points.find((p) => p.elevationM != null)?.elevationM;
  const top = s.trail.elevationM;
  if (r.altitudeM == null || start == null || top == null || top <= start) return null;
  return Math.min(1, Math.max(0, (r.altitudeM - start) / (top - start)));
}

function statusText(s: Shared) {
  if (s.demo) return "DEMO · simulated";
  switch (s.gps.status) {
    case "tracking":
      return `GPS LOCK · ±${Math.round(s.gps.fix?.accuracy ?? 0)} m`;
    case "locating":
      return "ACQUIRING GPS…";
    case "denied":
      return "GPS PERMISSION DENIED";
    case "unavailable":
      return "NO GPS ON DEVICE";
    case "error":
      return "NO FIX";
    default:
      return "GPS OFF";
  }
}

function DemoBanner({ night }: { night?: boolean }) {
  return (
    <div className={cn("flex items-start gap-2 rounded-lg px-3 py-2 text-xs font-medium ring-1", night ? "bg-amber-500/15 text-amber-200 ring-amber-500/40" : "bg-amber-50 text-amber-900 ring-amber-300")}>
      <AlertTriangle className="mt-0.5 size-4 shrink-0" />
      DEMO: a simulated hiker 61% up this trail, computed from guidebook data. These are not live readings.
    </div>
  );
}

function ConditionBanners({ s, night }: { s: Shared; night?: boolean }) {
  const a = s.trail.advisories[0];
  const highWind = s.wind != null && s.wind >= HIGH_WIND_KPH;
  return (
    <>
      {s.closed && (
        <div className={cn("flex items-start gap-2 rounded-lg px-3 py-2 text-sm ring-1", night ? "bg-red-500/15 text-red-200 ring-red-500/40" : "bg-red-50 text-red-800 ring-red-200")}>
          <OctagonAlert className="mt-0.5 size-4 shrink-0" />
          <div>
            <div className="font-semibold">Closed. Do not climb.</div>
            {a && <div className="text-xs opacity-90">{a.headline}</div>}
          </div>
        </div>
      )}
      {!s.closed && a && (
        <div className={cn("flex items-start gap-2 rounded-lg px-3 py-2 text-sm ring-1", night ? "bg-amber-500/15 text-amber-200 ring-amber-500/40" : "bg-amber-50 text-amber-900 ring-amber-200")}>
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <div>
            <div className="font-semibold">{a.headline}</div>
            {a.detail && <div className="line-clamp-2 text-xs opacity-90">{a.detail}</div>}
          </div>
        </div>
      )}
      {(highWind || s.wind != null) && (
        <div
          className={cn(
            "flex items-center gap-2 rounded-lg px-3 py-2 text-xs ring-1",
            highWind
              ? night
                ? "bg-red-500/15 text-red-200 ring-red-500/40"
                : "bg-red-50 text-red-800 ring-red-200"
              : night
                ? "bg-hud-800 text-emerald-100/80 ring-hud-line"
                : "bg-muted/60 text-muted-foreground ring-border"
          )}
        >
          <Wind className="size-4 shrink-0" />
          <span className="font-semibold">{highWind ? "High wind advisory" : "Wind"}</span>
          <span className="font-mono tabular-nums">
            {Math.round(s.wind ?? 0)} km/h{s.temp != null && ` · ${Math.round(s.temp)}°C`}
          </span>
          {s.weatherMock && <span className="ml-auto rounded bg-black/10 px-1.5 py-0.5 text-[10px] uppercase">sample weather</span>}
        </div>
      )}
    </>
  );
}

function PrimaryAction({ s, night }: { s: Shared; night?: boolean }) {
  if (s.closed) {
    return (
      <Button size="lg" disabled className="h-14 w-full text-base font-bold tracking-wide">
        <OctagonAlert /> Trail closed · tracking disabled
      </Button>
    );
  }
  if (s.demo) {
    return (
      <Button size="lg" onClick={() => s.setDemo(false)} className="h-14 w-full bg-amber-500 text-base font-bold tracking-wide text-black hover:bg-amber-400">
        Exit demo · use real GPS
      </Button>
    );
  }
  return (
    <Button
      size="lg"
      onClick={() => s.setTracking(!s.tracking)}
      className={cn(
        "h-14 w-full text-base font-bold tracking-wide",
        s.tracking ? (night ? "bg-hud-800 text-telemetry ring-1 ring-telemetry hover:bg-hud-800" : "bg-forest-900 hover:bg-forest-900/90") : "bg-[#2d5a3d] hover:bg-[#234830]"
      )}
    >
      <Navigation /> {s.tracking ? "Tracking · tap to stop" : "Follow route · start tracking"}
    </Button>
  );
}

function ModeSwitch({ s, night }: { s: Shared; night?: boolean }) {
  return (
    <div className={cn("inline-flex rounded-md p-0.5 text-xs font-semibold ring-1", night ? "bg-hud-900 ring-hud-line" : "bg-muted ring-border")} role="tablist" aria-label="Data source">
      {[
        [false, "Live GPS"],
        [true, "Demo"],
      ].map(([val, label]) => (
        <button
          key={String(label)}
          role="tab"
          aria-selected={s.demo === val}
          onClick={() => s.setDemo(val as boolean)}
          className={cn(
            "rounded px-2.5 py-1",
            s.demo === val
              ? val
                ? "bg-amber-500 text-black"
                : night
                  ? "bg-telemetry text-hud-950"
                  : "bg-primary text-primary-foreground"
              : night
                ? "text-emerald-100/70"
                : "text-muted-foreground"
          )}
        >
          {label as string}
        </button>
      ))}
    </div>
  );
}

function GpsHint({ s, night }: { s: Shared; night?: boolean }) {
  if (s.demo || s.gps.status === "tracking") return null;
  const msg =
    s.gps.error ??
    (s.tracking ? "Waiting for a GPS fix. Stand under open sky." : "Tap “Follow route” to read your phone’s GPS. Nothing is shown until there’s a real fix.");
  return <p className={cn("text-xs", night ? "text-emerald-100/60" : "text-muted-foreground")}>{msg}</p>;
}

// --- Desktop workstation ----------------------------------------------------------

function Workstation(s: Shared) {
  const cards = metrics(s);
  const frac = climbFraction(s);
  const pack = usePackMeta();

  return (
    <div className="container py-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link href={`/trails/${s.trail.slug}`} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary">
            <ArrowLeft className="size-3.5" /> {s.trail.name}
          </Link>
          <h1 className="font-display text-3xl font-semibold tracking-tight">Topo telemetry · {s.trail.name}</h1>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 font-mono text-xs text-muted-foreground">
            {s.summit ? <span>Summit {formatCoords(s.summit)}</span> : <span>No sourced summit coordinate</span>}
            {s.trail.elevationM != null && <span>{s.trail.elevationM.toLocaleString("en-US")} m MASL</span>}
            {s.bearing != null && (
              <span>
                Bearing {Math.round(s.bearing)}° {compassPoint(s.bearing)}
                {s.straightKm != null && ` · ${s.straightKm.toFixed(1)} km straight line`}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className={cn("rounded-full px-2.5 py-1 font-mono text-[11px] font-semibold ring-1", s.demo ? "bg-amber-50 text-amber-900 ring-amber-300" : s.gps.status === "tracking" ? "bg-secondary text-primary ring-primary/20" : "bg-muted text-muted-foreground ring-border")}>
            {statusText(s)}
          </span>
          <ModeSwitch s={s} />
        </div>
      </div>

      {s.demo && (
        <div className="mt-4">
          <DemoBanner />
        </div>
      )}

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <TopoMap
            summit={s.summit}
            summitLabel={`${s.trail.name.replace(/\s*\(.*\)/, "")}${s.trail.elevationM ? ` ${s.trail.elevationM.toLocaleString("en-US")} m` : ""}`}
            basecamp={s.basecamp}
            position={s.position}
            positionIsDemo={s.demo}
            className="aspect-[16/9] rounded-2xl border"
          />
          <section className="rounded-2xl border bg-card p-4">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold">Elevation cross-section</h2>
              {s.partial && <span className="text-xs text-muted-foreground">Start and summit only</span>}
            </div>
            <ElevationProfile
              points={s.points}
              ascentKm={s.ascentKm}
              markerKm={s.readout.profileKm}
              markerLabel={
                s.readout.profileKm != null && s.readout.altitudeM != null
                  ? `${s.demo ? "Demo position" : "You (by altitude)"} · ${Math.round(s.readout.altitudeM).toLocaleString("en-US")} m`
                  : undefined
              }
              demo={s.demo}
            />
          </section>
          <section>
            <h2 className="mb-2 font-display text-lg font-semibold">Checkpoints</h2>
            <CheckpointTable points={s.points} currentKm={s.readout.profileKm} water={s.trail.profile?.facilities.waterSources ?? null} />
          </section>
        </div>

        <aside className="space-y-4">
          <section className={cn("rounded-2xl p-4 text-white", "bg-hud-950")}>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-mono text-xs font-semibold uppercase tracking-widest text-telemetry">Ascent telemetry</h2>
              {s.demo && <span className="rounded bg-amber-500 px-1.5 py-0.5 text-[10px] font-bold text-black">DEMO</span>}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {cards.map((c) => (
                <div key={c.label} className="rounded-lg bg-hud-900 p-3 ring-1 ring-hud-line">
                  <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-emerald-100/60">
                    <c.icon className="size-3" /> {c.label}
                  </div>
                  <div className="mt-1 font-mono text-xl font-semibold tabular-nums text-white">{c.value}</div>
                  {c.sub && <div className="text-[10px] text-emerald-100/50">{c.sub}</div>}
                </div>
              ))}
            </div>
            {frac != null && (
              <div className="mt-3">
                <div className="flex justify-between text-[10px] uppercase tracking-wider text-emerald-100/60">
                  <span>{s.demo ? "Ascent progress" : "Climb progress (by altitude)"}</span>
                  <span className="font-mono">{Math.round(frac * 100)}%</span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-hud-800">
                  <div className={cn("h-full rounded-full", s.demo ? "bg-amber-500" : "bg-telemetry")} style={{ width: `${frac * 100}%` }} />
                </div>
              </div>
            )}
            {s.next && (
              <p className="mt-3 text-xs text-emerald-100/80">
                Next: <span className="font-semibold text-white">{s.next.name}</span>
                {s.readout.profileKm != null && ` in ~${Math.max(0, s.next.km - s.readout.profileKm).toFixed(1)} km along the route`}
              </p>
            )}
          </section>

          <ConditionBanners s={s} />
          <PrimaryAction s={s} />
          <GpsHint s={s} />

          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              disabled={s.demo || !s.gps.fix}
              onClick={() => s.gps.fix && s.waypoints.add({ lat: s.gps.fix.lat, lng: s.gps.fix.lng, altitude: s.gps.fix.altitude, t: Date.now() })}
            >
              <MapPin /> Mark waypoint{s.waypoints.list.length ? ` (${s.waypoints.list.length})` : ""}
            </Button>
            <Button asChild variant="outline">
              <Link href="/trails#offline">
                <Download /> {pack ? "Offline pack saved" : "Get offline pack"}
              </Link>
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Browsers don&apos;t expose satellite counts; accuracy comes from your phone&apos;s own estimate. Trail lines aren&apos;t drawn
            until surveyed tracks are added.
          </p>
        </aside>
      </div>
    </div>
  );
}

// --- Mobile field HUD -----------------------------------------------------------------

function FieldHud(s: Shared) {
  const cards = metrics(s);
  const battery = useBattery();
  const pack = usePackMeta();

  return (
    <div className="min-h-screen bg-hud-950 pb-20 text-white">
      {/* Top bar */}
      <div className="sticky top-0 z-[500] flex items-center gap-2 border-b border-hud-line bg-hud-950/95 px-3 py-2 backdrop-blur">
        <Link href={`/trails/${s.trail.slug}`} aria-label="Back to trail" className="rounded-md p-1.5 text-emerald-100/80 hover:bg-hud-800">
          <ArrowLeft className="size-5" />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="truncate font-mono text-[10px] uppercase tracking-widest text-telemetry">Forest Guardian · {statusText(s)}</div>
          <div className="truncate text-sm font-semibold">{s.trail.name}</div>
        </div>
        {battery != null && (
          <span className="inline-flex items-center gap-1 font-mono text-[11px] text-emerald-100/70">
            <BatteryMedium className="size-4" />
            {Math.round(battery * 100)}%
          </span>
        )}
        {pack ? <span className="text-[10px] font-semibold text-telemetry">OFFLINE ✓</span> : <WifiOff className="size-4 text-emerald-100/40" />}
        <SosButton />
      </div>

      {/* Map */}
      <div id="topo" className="relative">
        <TopoMap
          summit={s.summit}
          summitLabel={`${s.trail.name.replace(/\s*\(.*\)/, "")}${s.trail.elevationM ? ` ${s.trail.elevationM} m` : ""}`}
          basecamp={s.basecamp}
          position={s.position}
          positionIsDemo={s.demo}
          night
          className="h-[42vh]"
        />
      </div>

      {/* Drawer */}
      <div className="relative -mt-4 space-y-3 rounded-t-2xl border-t border-hud-line bg-hud-900 px-3 pb-4 pt-2">
        <div className="mx-auto h-1 w-10 rounded-full bg-hud-line" />
        <div className="flex items-center justify-between gap-2">
          <span className="truncate rounded-full bg-hud-800 px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider text-telemetry ring-1 ring-hud-line">
            {s.demo ? "Demo" : s.tracking ? "Active tracking" : "Standby"} · {s.trail.name.replace(/\s*\(.*\)/, "")}
            {s.gps.fix && !s.demo && ` · ±${Math.round(s.gps.fix.accuracy)} m`}
          </span>
          <ModeSwitch s={s} night />
        </div>

        {s.demo && <DemoBanner night />}
        <ConditionBanners s={s} night />

        <div className="grid grid-cols-3 gap-2">
          {cards.map((c) => (
            <div key={c.label} className="rounded-lg bg-hud-950 p-2.5 ring-1 ring-hud-line">
              <div className="text-[9px] uppercase tracking-wider text-emerald-100/55">{c.label}</div>
              <div className="font-mono text-base font-semibold tabular-nums">{c.value}</div>
            </div>
          ))}
        </div>

        <div className="rounded-lg bg-hud-950 p-2 ring-1 ring-hud-line">
          <ElevationProfile
            points={s.points}
            ascentKm={s.ascentKm}
            markerKm={s.readout.profileKm}
            markerLabel={s.readout.profileKm != null ? (s.demo ? "DEMO" : "NOW") : undefined}
            demo={s.demo}
            night
            compact
          />
        </div>

        {s.next && (
          <div className="flex items-center gap-2 rounded-lg bg-hud-800 px-3 py-2 text-sm">
            <Compass className="size-4 shrink-0 text-telemetry" />
            <span>
              {s.readout.profileKm != null ? `In ~${Math.max(0, Math.round((s.next.km - s.readout.profileKm) * 1000))} m: ` : "Next: "}
              <span className="font-semibold">{s.next.name}</span>
            </span>
          </div>
        )}

        <PrimaryAction s={s} night />
        <GpsHint s={s} night />

        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            className="border-hud-line bg-hud-950 text-white hover:bg-hud-800 hover:text-white"
            disabled={s.demo || !s.gps.fix}
            onClick={() => s.gps.fix && s.waypoints.add({ lat: s.gps.fix.lat, lng: s.gps.fix.lng, altitude: s.gps.fix.altitude, t: Date.now() })}
          >
            <MapPin /> Mark{s.waypoints.list.length ? ` (${s.waypoints.list.length})` : ""}
          </Button>
          <Button asChild variant="outline" className="border-hud-line bg-hud-950 text-white hover:bg-hud-800 hover:text-white">
            <Link href="/trails#offline">
              <Download /> {pack ? "Pack saved" : "Offline pack"}
            </Link>
          </Button>
        </div>

        <details className="rounded-lg bg-hud-950 ring-1 ring-hud-line">
          <summary className="cursor-pointer px-3 py-2 text-sm font-semibold">Checkpoints</summary>
          <div className="p-2">
            <CheckpointTable points={s.points} currentKm={s.readout.profileKm} water={s.trail.profile?.facilities.waterSources ?? null} night />
          </div>
        </details>
      </div>

      {/* Bottom navigation */}
      <nav className="fixed inset-x-0 bottom-0 z-[500] grid grid-cols-5 border-t border-hud-line bg-hud-950/95 pb-[env(safe-area-inset-bottom)] backdrop-blur" aria-label="Field navigation">
        <NavItem href="#topo" icon={MapPin} label="Topo" active />
        <NavItem href="/trails" icon={List} label="Trails" />
        <button
          onClick={() => !s.closed && !s.demo && s.setTracking(!s.tracking)}
          className={cn("flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium", s.tracking ? "text-telemetry" : "text-emerald-100/60")}
        >
          <Navigation className="size-5" /> Track
        </button>
        <NavItem href="/trails#offline" icon={Download} label="Offline" />
        <NavItem href="/dashboard" icon={UserRound} label="Profile" />
      </nav>
    </div>
  );
}

function NavItem({ href, icon: Icon, label, active }: { href: string; icon: typeof MapPin; label: string; active?: boolean }) {
  return (
    <Link href={href} className={cn("flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium", active ? "text-telemetry" : "text-emerald-100/60")}>
      <Icon className="size-5" /> {label}
    </Link>
  );
}

