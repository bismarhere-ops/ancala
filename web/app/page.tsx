import Image from "next/image";
import Link from "next/link";
import {
  Activity,
  ArrowRight,
  ClipboardCheck,
  Compass,
  LineChart,
  Map as MapIcon,
  Megaphone,
  Mountain,
  OctagonAlert,
  Route,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrailCard } from "@/components/trail-card";
import { ImpactStats } from "@/components/impact-stats";
import { HomeMap } from "@/components/home-map";
import { StatusBadge } from "@/components/status-badge";
import { getImpact, getTrail, listAllTrails } from "@/lib/api";
import { fallback } from "@/lib/server-fallback";
import { STATUS_LABEL, STATUS_TONE, trailStatus, type TrailStatus } from "@/lib/trail-status";
import type { Trail } from "@/lib/types";
import { cn, formatMinutes, formatNumber, fmtKm, fmtDuration } from "@/lib/utils";

export const revalidate = 300;

const BROMO = "/mountains/bromo";

/** Closed trails with the advisory that explains why, newest first. */
function currentClosures(trails: Trail[]) {
  return trails
    .filter((t) => trailStatus(t) === "closed")
    .map((t) => {
      const a = t.advisories.find((x) => x.severity === "danger") ?? t.advisories[0] ?? null;
      return { trail: t, headline: a?.headline ?? "Closed to hiking", since: a?.effectiveFrom ?? null };
    })
    .sort((x, y) => (y.since ?? "").localeCompare(x.since ?? ""));
}

function fmtDate(iso: string | null) {
  if (!iso) return null;
  const d = new Date(`${iso}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
}

export default async function HomePage() {
  const [trails, impact, bromo] = await Promise.all([
    listAllTrails({ sort: "popular" }).catch(fallback([] as Trail[], "trails")),
    getImpact().catch(fallback(null, "impact")),
    getTrail("bromo").catch(() => null),
  ]);

  const featured = trails.slice(0, 3);
  // Every mountain with a photo, tallest first, for the scrolling strip.
  const stripTrails = trails
    .filter((t) => t.coverImage)
    .sort((a, b) => (b.elevationM ?? 0) - (a.elevationM ?? 0));
  const hasTrails = trails.length > 0;

  // Only `measured` metrics belong in the hero. Unknown -> "—", never 0.
  const mountains =
    impact?.data.metrics.find((m) => m.key === "mountains_mapped" && m.kind === "measured")?.value ?? null;
  const counts = trails.reduce(
    (acc, t) => ((acc[trailStatus(t)] += 1), acc),
    { open: 0, check: 0, warning: 0, closed: 0 } as Record<TrailStatus, number>
  );
  const closures = currentClosures(trails);
  const bromoTrail = bromo ?? trails.find((t) => t.slug === "bromo") ?? null;
  const tagline = bromo?.story?.tagline ?? null;

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-hero-grain">
        <div className="absolute inset-x-0 top-0 -z-10 h-[560px] bg-gradient-to-b from-forest-50 to-transparent" />
        <div className="container grid gap-10 pb-4 pt-12 md:grid-cols-12 md:pb-8 md:pt-20">
          <div className="md:col-span-7">
            <Badge variant="outline" className="mb-5 border-forest-200 bg-forest-50 text-forest-700">
              CSR Initiative · Est. 2024
            </Badge>
            <h1 className="font-display text-4xl font-semibold leading-[1.05] tracking-tight text-balance md:text-6xl">
              Hike the wild.
              <br />
              <span className="italic text-primary">Guard the forest.</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg text-muted-foreground">
              A connected platform for hikers and communities to prepare safely, discover trails,
              and turn every step into measurable impact for the forest.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href="/trails">
                  <Compass /> Plan Your Hike
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/community#volunteer">Join as Guardian</Link>
              </Button>
            </div>
            <dl className="mt-10 grid max-w-lg grid-cols-3 gap-6">
              {[
                { n: mountains, l: "Mountains mapped" },
                { n: hasTrails ? counts.open + counts.check : null, l: "Open today" },
                { n: hasTrails ? counts.closed : null, l: "Closed now", alert: true },
              ].map((s) => (
                <div key={s.l}>
                  <dt className={cn("font-display text-2xl font-semibold md:text-3xl", s.alert && s.n ? "text-red-700" : "")}>
                    {s.n == null ? "—" : formatNumber(s.n)}
                  </dt>
                  <dd className="text-xs text-muted-foreground">{s.l}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="md:col-span-5">
            <Link
              href="/trails/bromo"
              className="group relative block aspect-[4/5] overflow-hidden rounded-3xl bg-forest-800 shadow-xl"
            >
              <Image
                src={`${BROMO}/pura-luhur-poten.jpg`}
                alt="Pura Luhur Poten temple on the Sea of Sand below Mount Bromo"
                fill
                priority
                sizes="(min-width: 768px) 40vw, 100vw"
                className="object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/5 to-black/85" />
              <div className="absolute inset-x-5 top-5 flex items-center justify-between gap-2">
                <span className="rounded-full bg-white/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-white backdrop-blur">
                  Featured trail
                </span>
                {bromoTrail && <StatusBadge trail={bromoTrail} className="bg-white/90" />}
              </div>
              <div className="absolute inset-x-5 bottom-5 text-white">
                <div className="mb-4 flex gap-2">
                  {[
                    ["sea-of-sand", "Sea of Sand"],
                    ["crater-stairs", "Crater stairs"],
                    ["kasada-offerings", "Kasada offerings"],
                  ].map(([file, label]) => (
                    <div key={file} className="relative h-14 w-20 overflow-hidden rounded-lg ring-2 ring-white/70">
                      <Image src={`${BROMO}/${file}.jpg`} alt={label} fill sizes="80px" className="object-cover" />
                    </div>
                  ))}
                </div>
                <div className="text-xs uppercase tracking-wider opacity-80">East Java</div>
                <div className="font-display text-2xl font-semibold leading-tight">Mount Bromo</div>
                {tagline && <p className="mt-1 text-sm italic text-white/85">{tagline}</p>}
                {bromoTrail && (
                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 font-mono text-xs tabular-nums text-white/85">
                    {bromoTrail.elevationM != null && (
                      <span className="inline-flex items-center gap-1">
                        <Mountain className="size-3.5" /> {bromoTrail.elevationM.toLocaleString("en-US")} m
                      </span>
                    )}
                    {!!bromoTrail.distanceKm && (
                      <span className="inline-flex items-center gap-1">
                        <Route className="size-3.5" /> {fmtKm(bromoTrail.distanceKm)}
                      </span>
                    )}
                    {!!bromoTrail.estimatedMinutes && (
                      <span className="inline-flex items-center gap-1">
                        <Clock className="size-3.5" /> {fmtDuration(bromoTrail.estimatedMinutes)}
                      </span>
                    )}
                  </div>
                )}
                <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold">
                  Open trail <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                </span>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* Conditions now */}
      <section className="container mt-12 md:mt-16">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-2xl font-semibold md:text-3xl">Conditions now</h2>
            <p className="text-sm text-muted-foreground">
              Every mountain we cover, coloured by its current status. Tap a pin to open the trail.
            </p>
          </div>
          <Button asChild variant="ghost">
            <Link href="/trails?view=map">
              Open the full map <ArrowRight />
            </Link>
          </Button>
        </div>

        {hasTrails ? (
          <div className="grid gap-6 lg:grid-cols-5">
            <div className="lg:col-span-3">
              <HomeMap trails={trails} />
            </div>
            <div className="space-y-4 lg:col-span-2">
              <dl className="grid grid-cols-2 gap-3">
                {(["open", "check", "warning", "closed"] as TrailStatus[]).map((k) => (
                  <div key={k} className="rounded-xl border bg-card p-3">
                    <dt className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                      <span className={cn("size-2 rounded-full", STATUS_TONE[k].dot)} /> {STATUS_LABEL[k]}
                    </dt>
                    <dd className={cn("mt-1 font-mono text-2xl font-semibold tabular-nums", k === "closed" && counts.closed ? "text-red-700" : "")}>
                      {counts[k]}
                    </dd>
                  </div>
                ))}
              </dl>

              {closures.length > 0 && (
                <Card>
                  <CardContent className="p-4">
                    <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-red-700">
                      <OctagonAlert className="size-4" /> Closed now
                    </div>
                    <ul className="divide-y">
                      {closures.slice(0, 6).map(({ trail, headline, since }) => (
                        <li key={trail.slug}>
                          <Link href={`/trails/${trail.slug}`} className="flex items-start justify-between gap-3 py-2 hover:text-primary">
                            <span className="min-w-0">
                              <span className="block text-sm font-medium">{trail.name}</span>
                              <span className="block truncate text-xs text-muted-foreground">{headline}</span>
                            </span>
                            {fmtDate(since) && (
                              <span className="shrink-0 font-mono text-[11px] text-muted-foreground">since {fmtDate(since)}</span>
                            )}
                          </Link>
                        </li>
                      ))}
                    </ul>
                    {closures.length > 6 && (
                      <Link href="/trails?view=map" className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
                        +{closures.length - 6} more closed <ArrowRight className="size-3.5" />
                      </Link>
                    )}
                  </CardContent>
                </Card>
              )}
              <p className="text-xs text-muted-foreground">
                Statuses come from published closures and volcano alerts. Always confirm with the basecamp before you go.
              </p>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
            Live conditions are unavailable right now. Check back shortly.
          </div>
        )}
      </section>

      {/* Mountain photo strip */}
      {stripTrails.length > 0 && (
        <section className="mt-16 md:mt-20">
          <div className="container flex items-end justify-between gap-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">From Sumatra to Sulawesi</div>
              <h2 className="mt-1 font-display text-3xl font-semibold tracking-tight md:text-4xl">
                {stripTrails.length} mountains, one archipelago.
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">Highest first. Scroll sideways, tap one to open its field guide.</p>
            </div>
            <Link href="/trails" className="hidden shrink-0 items-center gap-1 text-sm font-medium text-primary hover:underline sm:inline-flex">
              All trails <ArrowRight className="size-4" />
            </Link>
          </div>
          <ul className="no-scrollbar mt-6 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4 md:px-[max(1rem,calc((100vw-1400px)/2+2rem))]">
            {stripTrails.map((t) => {
              return (
                <li key={t.slug} className="w-[220px] shrink-0 snap-start md:w-[260px]">
                  <Link
                    href={`/trails/${t.slug}`}
                    className="group relative block aspect-[3/4] overflow-hidden rounded-2xl bg-forest-800 shadow-sm"
                  >
                    <Image
                      src={t.coverImage!}
                      alt={`${t.name}, ${t.region}`}
                      fill
                      sizes="260px"
                      className="object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent" />
                    <span className="absolute left-3 top-3">
                      <StatusBadge trail={t} className="bg-white/90" />
                    </span>
                    <div className="absolute inset-x-0 bottom-0 p-4 text-white">
                      <div className="text-[11px] uppercase tracking-wider text-white/70">{t.region}</div>
                      <div className="font-display text-xl font-semibold leading-tight">{t.name}</div>
                      {t.elevationM != null && (
                        <div className="mt-1 font-mono text-sm text-amber-200">{t.elevationM.toLocaleString("en-US")} m</div>
                      )}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* Quick actions */}
      <section className="container mt-10">
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
          {[
            { href: "/trails?view=map", icon: MapIcon, title: "Trails & map", desc: "All mountains with live status.", photo: "/mountains/rinjani/20240408-093512.jpg" },
            { href: "/telemetry", icon: Activity, title: "Topo telemetry", desc: "Your GPS on a contour map.", photo: "/mountains/penanggungan/summit-track-2.jpg" },
            { href: "/dashboard", icon: ClipboardCheck, title: "Preparation checklist", desc: "Gear, documents and first aid.", photo: "/mountains/semeru/img-20180826-052802.jpg" },
            { href: "/community#report", icon: Megaphone, title: "Report a condition", desc: "Damage, waste, hazards.", photo: "/mountains/semeru/img-20180825-162556.jpg" },
          ].map(({ href, icon: Icon, title, desc, photo }) => (
            <Link
              key={href}
              href={href}
              className="group relative flex h-44 flex-col justify-end overflow-hidden rounded-2xl bg-forest-800 p-5 text-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
            >
              <Image
                src={photo}
                alt=""
                fill
                sizes="(min-width: 768px) 25vw, (min-width: 640px) 50vw, 100vw"
                className="object-cover transition-transform duration-500 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-forest-900/95 via-forest-900/50 to-forest-900/10" />
              <div className="relative flex size-9 items-center justify-center rounded-full bg-white/20 ring-1 ring-white/30">
                <Icon className="size-4" />
              </div>
              <div className="relative mt-3 flex items-end justify-between gap-2">
                <div>
                  <div className="font-display text-lg font-semibold leading-tight">{title}</div>
                  <div className="text-sm text-white/75">{desc}</div>
                </div>
                <ArrowRight className="size-5 shrink-0 transition-transform group-hover:translate-x-1" />
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Storytelling */}
      <section className="container mt-16 grid items-center gap-10 md:grid-cols-2 md:mt-24">
        <div className="relative grid aspect-[5/4] grid-cols-3 grid-rows-2 gap-3">
          {[
            ["horse-ride", "Horseback below Mount Batok", "col-span-2"],
            ["crater-ganesha", "Ganesha statue at the crater", ""],
            ["kasada-offerings", "Kasada offerings", ""],
            ["sea-of-sand", "Sea of Sand", "col-span-2"],
          ].map(([file, caption, span]) => (
            <figure key={file} className={cn("relative overflow-hidden rounded-2xl bg-forest-800", span)}>
              <Image src={`${BROMO}/${file}.jpg`} alt={caption} fill sizes="(min-width: 768px) 30vw, 60vw" className="object-cover" />
              <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-3 pb-2 pt-6 text-[11px] font-medium text-white">
                {caption}
              </figcaption>
            </figure>
          ))}
          <div className="absolute left-3 top-3 rounded-full bg-white/85 px-3 py-1 text-xs font-medium text-forest-900 backdrop-blur">
            Our commitment · Bromo
          </div>
        </div>
        <div>
          <h2 className="font-display text-3xl font-semibold tracking-tight md:text-4xl">
            Furniture that lives — a forest that lasts.
          </h2>
          <p className="mt-4 text-muted-foreground">
            For every piece we craft, we give back to the forests that give us timber, air, and awe.
            Forest Guardian is our long-term commitment to reforestation, responsible trail access,
            and the communities that care for both.
          </p>
          <ul className="mt-5 space-y-2 text-sm">
            {["Certified timber sourcing", "Local reforestation partners", "Transparent impact reports"].map((x) => (
              <li key={x} className="flex items-center gap-2">
                <span className="size-1.5 rounded-full bg-primary" />
                {x}
              </li>
            ))}
          </ul>
          <Button asChild variant="link" className="mt-4 px-0">
            <Link href="/program">Read our program <ArrowRight /></Link>
          </Button>
        </div>
      </section>

      {/* Featured trails */}
      {featured.length > 0 && (
        <section className="container mt-20">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <h2 className="font-display text-2xl font-semibold md:text-3xl">Featured trails</h2>
              <p className="text-sm text-muted-foreground">The most popular routes in our data.</p>
            </div>
            <Button asChild variant="ghost">
              <Link href="/trails">See all <ArrowRight /></Link>
            </Button>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            {featured.map((t) => (
              <TrailCard key={t.slug} trail={t} />
            ))}
          </div>
        </section>
      )}

      {/* Impact */}
      {impact && (
        <section className="container mt-24">
          <div className="mb-6 flex items-center gap-3">
            <LineChart className="size-5 text-primary" />
            <h2 className="font-display text-2xl font-semibold md:text-3xl">Impact, in numbers.</h2>
          </div>
          <ImpactStats impact={impact} />
        </section>
      )}

      {/* CTA */}
      <section className="container mt-24">
        <div className="relative overflow-hidden rounded-3xl bg-forest-900 p-10 text-white md:p-14">
          <Image
            src="/mountains/semeru/img-20180827-055936.jpg"
            alt=""
            fill
            sizes="(min-width: 1400px) 1340px, 100vw"
            className="object-cover"
            style={{ objectPosition: "center 40%" }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-forest-900/95 via-forest-900/75 to-forest-900/30" />
          <span className="absolute bottom-2 right-4 z-10 text-[10px] text-white/55">Photo: Jejak Ancala · Mahameru summit</span>
          <div className="relative z-10 flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
            <div>
              <h2 className="font-display text-3xl font-semibold">Become a Forest Guardian.</h2>
              <p className="mt-2 max-w-xl text-forest-100">
                Volunteer for a planting day, a trail clean-up, or a guided bootcamp.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button asChild variant="secondary" size="lg">
                <Link href="/community#volunteer">Join as Guardian</Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="border-forest-200/50 bg-transparent text-white hover:bg-white/10 hover:text-white">
                <Link href="/community#report">Report Condition</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
