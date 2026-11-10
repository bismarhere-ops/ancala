import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Leaf, Sprout, Users, Quote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ImpactStats } from "@/components/impact-stats";
import { PhotoHero } from "@/components/photo-hero";
import { getImpact } from "@/lib/api";
import { fallback } from "@/lib/server-fallback";

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
  { when: "Dates TBC", where: "Ranu Pani", mountain: "Semeru", slug: "semeru", photo: "/mountains/semeru/img-20180826-052802.jpg", credit: "Photo: Jejak Ancala" },
  { when: "Dates TBC", where: "Cemoro Lawang", mountain: "Bromo", slug: "bromo", photo: "/mountains/bromo/penanjakan-sunrise.jpg", credit: "Photo: Jejak Ancala" },
  { when: "Dates TBC", where: "Paltuding", mountain: "Ijen", slug: "ijen", photo: "/mountains/ijen/wiki-2.jpg", credit: "Photo: Thomas Fuhrmann, CC BY-SA 4.0, via Wikimedia Commons" },
  { when: "Dates TBC", where: "Tamiajeng", mountain: "Penanggungan", slug: "penanggungan", photo: "/mountains/penanggungan/guru-temple.jpg", credit: "Photo: Jejak Ancala" },
];

export default async function ProgramPage() {
  const impact = await getImpact().catch(fallback(null, "impact"));

  const treesPct = Math.round(
    ((impact?.data.metrics.find((m) => m.key === "trees_planted")?.value ?? 0) / 60_000) * 100
  );

  return (
    <>
      <PhotoHero
        src="/mountains/penanggungan/peak-view.jpg"
        credit="Photo: Jejak Ancala · Penanggungan peak"
        position="center 35%"
        eyebrow="The Forest Guardian Program"
        title={
          <>
            Every trail walked,
            <br />
            <span className="italic text-amber-200">a forest restored.</span>
          </>
        }
      >
        Our CSR program connects hikers, local communities and our furniture craftspeople around one
        mission: restore more forest than we take.
      </PhotoHero>

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
          <ul className="mt-6 grid grid-cols-2 gap-3">
            {SCHEDULE.map((s) => (
              <li key={s.where}>
                <Link
                  href={`/trails/${s.slug}`}
                  className="group relative block aspect-[4/3] overflow-hidden rounded-xl bg-forest-800"
                >
                  <Image
                    src={s.photo}
                    alt={`${s.mountain} near ${s.where}`}
                    fill
                    sizes="(min-width: 768px) 25vw, 50vw"
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  <Badge className="absolute right-2 top-2 bg-white/90 text-forest-900 hover:bg-white/90">Planned</Badge>
                  <div className="absolute inset-x-0 bottom-0 p-3 text-white">
                    <div className="text-[11px] uppercase tracking-wider text-amber-200">{s.mountain}</div>
                    <div className="font-display text-lg font-semibold leading-tight">{s.where}</div>
                    <div className="text-xs text-white/75">{s.when}</div>
                  </div>
                  <span className="absolute bottom-1 right-2 max-w-[60%] truncate text-[9px] text-white/55">{s.credit}</span>
                </Link>
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
        <figure className="relative isolate flex min-h-[420px] flex-col justify-end overflow-hidden rounded-2xl bg-forest-900 p-8 text-white">
          <Image
            src="/mountains/semeru/img-20180826-054500.jpg"
            alt="Sunrise over the lake camp on the Semeru trail"
            fill
            sizes="(min-width: 768px) 50vw, 100vw"
            className="-z-10 object-cover"
          />
          <div className="absolute inset-0 -z-10 bg-gradient-to-t from-black/85 via-black/40 to-black/10" />
          <Quote className="size-8 text-amber-300" />
          <blockquote className="mt-3 font-display text-2xl leading-snug">
            We measure our success not by what we sell, but by the forest we leave behind.
          </blockquote>
          <figcaption className="mt-4 text-sm text-forest-100">— The founding team</figcaption>
          <span className="absolute bottom-2 right-3 text-[10px] text-white/55">Photo: Jejak Ancala · Semeru</span>
        </figure>
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
