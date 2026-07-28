import type { Metadata } from "next";
import Link from "next/link";
import { Leaf, Sprout, Users, Quote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ImpactStats } from "@/components/impact-stats";
import { getImpact } from "@/lib/api";

export const metadata: Metadata = {
  title: "The Forest Guardian Program",
  description: "Reforestation, Plant & Protect, bootcamps, and transparent impact.",
};

export const revalidate = 300;

const PILLARS = [
  {
    icon: Users,
    n: "01",
    title: "Reforestation awareness",
    desc:
      "Public campaigns, school partnerships and in-store events teaching the economics and ecology of forests.",
    bullets: ["Quarterly field days", "Partner schools & universities", "In-store sustainability corners"],
  },
  {
    icon: Sprout,
    n: "02",
    title: "Plant & Protect",
    desc:
      "Every product sold funds a tree. Every guardian can track their own grove and verify planting on the ground.",
    bullets: ["One product = one tree", "Geo-tagged plot tracking", "Annual survival audits"],
  },
  {
    icon: Leaf,
    n: "03",
    title: "Guardian Bootcamp",
    desc:
      "Weekend training for volunteers: navigation, first aid, trail maintenance, and sustainable camping.",
    bullets: ["Certified wilderness first-aid", "Leave-no-trace practices", "Trail maintenance crew"],
  },
];

/**
 * Placeholder schedule — no bootcamp dates are confirmed yet. Locations are
 * real basecamps from the mountains dataset so the page never invents a place,
 * but the dates are illustrative and the page says so.
 */
const SCHEDULE = [
  { when: "Dates TBC", where: "Ranu Pani (Semeru)", status: "planned" as const },
  { when: "Dates TBC", where: "Cemoro Lawang (Bromo)", status: "planned" as const },
  { when: "Dates TBC", where: "Paltuding (Ijen)", status: "planned" as const },
  { when: "Dates TBC", where: "Tamiajeng (Penanggungan)", status: "planned" as const },
];

export default async function ProgramPage() {
  const impact = await getImpact().catch(() => null);

  const treesPct = Math.round(
    ((impact?.data.metrics.find((m) => m.key === "trees_planted")?.value ?? 0) / 60_000) * 100
  );

  return (
    <>
      <section className="bg-forest-50">
        <div className="container py-14 md:py-20">
          <div className="mb-2 text-xs font-medium uppercase tracking-wider text-primary">
            The Forest Guardian Program
          </div>
          <h1 className="font-display text-4xl font-semibold leading-[1.05] tracking-tight text-balance md:text-6xl">
            Every trail walked,
            <br />
            <span className="italic text-primary">a forest restored.</span>
          </h1>
          <p className="mt-4 max-w-2xl text-muted-foreground">
            Our CSR program connects hikers, local communities and our furniture craftspeople
            around one mission: restore more forest than we take.
          </p>
        </div>
      </section>

      {/* Pillars */}
      <section className="container py-16">
        <div className="grid gap-6 md:grid-cols-3">
          {PILLARS.map(({ icon: Icon, n, title, desc, bullets }) => (
            <Card key={n} className="h-full">
              <CardHeader className="gap-2">
                <div className="flex items-center justify-between">
                  <div className="flex size-10 items-center justify-center rounded-full bg-forest-50 text-primary">
                    <Icon className="size-5" />
                  </div>
                  <span className="font-display text-sm text-muted-foreground">{n}</span>
                </div>
                <CardTitle className="mt-2">{title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{desc}</p>
                <ul className="mt-4 space-y-1.5 text-sm">
                  {bullets.map((b) => (
                    <li key={b} className="flex items-center gap-2">
                      <span className="size-1.5 rounded-full bg-primary" />
                      {b}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Tracker */}
      <section className="bg-secondary/50">
        <div className="container py-16">
          <h2 className="font-display text-3xl font-semibold tracking-tight">Plant &amp; Protect tracker</h2>
          <p className="mt-1 text-sm text-muted-foreground">Our public commitment — updated monthly.</p>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <Card>
              <CardContent className="p-6">
                <h3 className="text-sm font-medium text-muted-foreground">2026 goal</h3>
                <p className="mt-1 font-display text-3xl font-semibold">60,000 trees</p>
                <Progress value={treesPct} className="mt-3" />
                <p className="mt-2 text-xs text-muted-foreground">{treesPct}% complete</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <h3 className="text-sm font-medium text-muted-foreground">Survival rate</h3>
                <p className="mt-1 font-display text-3xl font-semibold">92%</p>
                <Progress value={92} className="mt-3" />
                <p className="mt-2 text-xs text-muted-foreground">Audited by independent partners</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <h3 className="text-sm font-medium text-muted-foreground">Protected area</h3>
                <p className="mt-1 font-display text-3xl font-semibold">1,840 ha</p>
                <Progress value={46} className="mt-3" />
                <p className="mt-2 text-xs text-muted-foreground">Four priority corridors</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Bootcamp */}
      <section className="container grid items-start gap-8 py-16 md:grid-cols-2">
        <div>
          <div className="mb-2 text-xs font-medium uppercase tracking-wider text-primary">
            Bootcamp
          </div>
          <h2 className="font-display text-3xl font-semibold tracking-tight md:text-4xl">
            Train with rangers, for the wild.
          </h2>
          <p className="mt-3 text-muted-foreground">
            Two days in the field with certified rangers and our sustainability team. Open to
            guardians and community members.
          </p>
          <ul className="mt-6 divide-y rounded-xl border">
            {SCHEDULE.map((s) => (
              <li key={s.where} className="flex items-center justify-between gap-3 p-4">
                <div>
                  <div className="font-medium">{s.where}</div>
                  <div className="text-xs text-muted-foreground">{s.when}</div>
                </div>
                <Badge variant="outline">Planned</Badge>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-muted-foreground">
            Locations are confirmed basecamps; dates are not yet scheduled. Register your interest
            and we will contact you when a session opens.
          </p>
          <Button asChild className="mt-6">
            <Link href="/community#volunteer">Apply to the bootcamp</Link>
          </Button>
        </div>
        <Card className="bg-forest-900 text-white">
          <CardContent className="p-8">
            <Quote className="size-8 text-amber/80" />
            <p className="mt-3 font-display text-xl leading-snug">
              We measure our success not by what we sell, but by the forest we leave behind.
            </p>
            <p className="mt-4 text-sm text-forest-200">— The founding team</p>
          </CardContent>
        </Card>
      </section>

      {/* Impact */}
      {impact && (
        <section id="impact" className="container py-10">
          <div className="mb-6">
            <h2 className="font-display text-3xl font-semibold tracking-tight">Impact dashboard</h2>
            <p className="text-sm text-muted-foreground">Live data pulled from partner field reports.</p>
          </div>
          <ImpactStats impact={impact} />
        </section>
      )}
    </>
  );
}
