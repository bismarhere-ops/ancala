import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Clock,
  Download,
  MapPin,
  Mountain,
  OctagonAlert,
  Route,
  TriangleAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { WeatherCard } from "@/components/weather-card";
import { AccessBanner } from "@/components/access-banner";
import { AdvisoryBanner } from "@/components/advisory-banner";
import { TrailProfile } from "@/components/trail-profile";
import { getTrail, getWeather } from "@/lib/api";
import { cn, difficultyColor, formatMinutes, riskColor } from "@/lib/utils";

export const revalidate = 60;

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  try {
    const trail = await getTrail(params.slug);
    return {
      title: trail.name,
      description: trail.summary,
    };
  } catch {
    return { title: "Trail not found" };
  }
}

export default async function TrailDetailPage({
  params,
}: {
  params: { slug: string };
}) {
  let trail;
  try {
    trail = await getTrail(params.slug);
  } catch {
    notFound();
  }
  if (!trail) notFound();

  const weather = await getWeather({ slug: trail.slug }).catch(() => null);

  return (
    <>
      {/* Hero */}
      <section className="bg-forest-900 text-white">
        <div className="container py-10 md:py-14">
          <div className="mb-3 flex items-center gap-2 text-xs text-forest-100">
            <Link href="/trails" className="hover:text-white">Trails</Link>
            <ArrowRight className="size-3" />
            <span>{trail.region}</span>
          </div>
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div>
              <h1 className="font-display text-4xl font-semibold tracking-tight text-balance md:text-5xl">
                {trail.name}
              </h1>
              <p className="mt-3 max-w-2xl text-forest-100">{trail.summary}</p>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <Badge variant="outline" className={cn("capitalize", difficultyColor(trail.difficulty))}>
                  {trail.difficulty}
                </Badge>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-2.5 py-0.5 text-xs">
                  <span className={cn("size-1.5 rounded-full", riskColor(trail.risk))} />
                  {trail.risk} risk
                </span>
                {trail.tags.map((t) => (
                  <span
                    key={t}
                    className="rounded-full border border-white/20 bg-white/10 px-2.5 py-0.5 text-xs"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button asChild variant="secondary">
                <a href={`/api/trails/${trail.slug}/guide`} download>
                  <Download /> Offline guide
                </a>
              </Button>
              {/* Planning is withheld for closed mountains — Sinabung sits in an
                  enforced exclusion zone, so offering a planner would be wrong. */}
              {!trail.plannable ? (
                <span className="inline-flex items-center gap-2 rounded-md border border-red-300/40 bg-red-500/15 px-3 py-2 text-sm text-red-100">
                  <OctagonAlert className="size-4" /> Closed — planning disabled
                </span>
              ) : (
                <Button asChild variant="outline" className="border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white">
                  <Link href="/dashboard">Plan this hike</Link>
                </Button>
              )}
            </div>
          </div>

          <dl className="mt-10 grid grid-cols-3 gap-6 border-t border-white/10 pt-6 md:max-w-xl">
            <div>
              <dt className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wider text-forest-100">
                <Route className="size-3.5" /> Distance
              </dt>
              <dd className="font-display text-2xl font-semibold">{trail.distanceKm.toFixed(1)} km</dd>
            </div>
            <div>
              <dt className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wider text-forest-100">
                <Mountain className="size-3.5" /> Elevation
              </dt>
              <dd className="font-display text-2xl font-semibold">{trail.elevationGainM} m</dd>
            </div>
            <div>
              <dt className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wider text-forest-100">
                <Clock className="size-3.5" /> Est. time
              </dt>
              <dd className="font-display text-2xl font-semibold">{formatMinutes(trail.estimatedMinutes)}</dd>
            </div>
          </dl>
        </div>
      </section>

      {(trail.advisories.length > 0 ||
        (trail.accessStatus && trail.accessStatus !== "open")) && (
        <div className="container space-y-3 pt-6">
          {/* Live conditions first — they are the most time-sensitive. */}
          <AdvisoryBanner advisories={trail.advisories} />
          <AccessBanner status={trail.accessStatus} />
        </div>
      )}

      {/* Body */}
      <section className="container grid gap-8 py-10 lg:grid-cols-3 lg:py-14">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="size-5 text-primary" /> Checkpoints
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="space-y-0">
                {trail.checkpoints.map((cp, i) => (
                  <li key={i} className="relative flex gap-4 pb-6 last:pb-0">
                    <div className="flex flex-col items-center">
                      <div className="flex size-8 items-center justify-center rounded-full bg-forest-100 text-sm font-semibold text-primary">
                        {i + 1}
                      </div>
                      {i < trail.checkpoints.length - 1 && (
                        <div className="mt-1 h-full w-px flex-1 bg-border" />
                      )}
                    </div>
                    <div className="pb-6 last:pb-0">
                      <div className="flex flex-wrap items-baseline gap-3">
                        <h3 className="font-display text-base font-semibold">{cp.name}</h3>
                        <span className="text-xs text-muted-foreground">
                          {cp.km.toFixed(1)} km
                          {cp.elevationM != null && ` · ${cp.elevationM} m`}
                          {cp.etaMin != null && ` · ETA ${formatMinutes(cp.etaMin)}`}
                        </span>
                      </div>
                      {cp.notes && <p className="mt-1 text-sm text-muted-foreground">{cp.notes}</p>}
                    </div>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>

          {trail.hazards.length > 0 && (
            <Card className="mt-6 border-amber/30 bg-amber/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-amber-900">
                  <TriangleAlert className="size-5" /> Known hazards
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {trail.hazards.map((h) => (
                    <li key={h} className="flex items-start gap-2 text-sm">
                      <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-700" />
                      <span>{h}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {trail.profile && (
            <div className="mt-6">
              <TrailProfile profile={trail.profile} />
            </div>
          )}
        </div>

        <aside className="space-y-6">
          {weather ? (
            <WeatherCard weather={weather} />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Weather</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Forecast unavailable right now.</p>
              </CardContent>
            </Card>
          )}
          <Card>
            <CardHeader>
              <CardTitle>Before you go</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p>• Tell someone your plan and expected return time.</p>
              <p>
                •{" "}
                {trail.profile?.safety.waterRequirementLiters
                  ? `Carry ${trail.profile.safety.waterRequirementLiters} L of water for this route.`
                  : "Carry 2L of water minimum; filter if refilling."}
              </p>
              <p>• Turn back if weather deteriorates — summit optional, return mandatory.</p>
              {trail.profile?.facilities.signalCoverage && (
                <p>• Signal: {trail.profile.facilities.signalCoverage}</p>
              )}
              <Separator />
              <div className="flex flex-wrap gap-2">
                <Button asChild size="sm" variant="outline">
                  <a href="tel:112">Call 112</a>
                </Button>
                <Button asChild size="sm" variant="outline">
                  <Link href="/community#report">Report condition</Link>
                </Button>
              </div>
              {trail.profile?.safety.emergencyContact && (
                <p className="text-xs text-muted-foreground">
                  Local rescue: {trail.profile.safety.emergencyContact}
                </p>
              )}
            </CardContent>
          </Card>
        </aside>
      </section>
    </>
  );
}
