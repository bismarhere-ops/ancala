import Link from "next/link";
import {
  ArrowRight,
  Compass,
  Leaf,
  LineChart,
  MapPin,
  Megaphone,
  ShieldCheck,
  TreePine,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrailCard } from "@/components/trail-card";
import { ImpactStats } from "@/components/impact-stats";
import { getImpact, listTrails } from "@/lib/api";
import { formatNumber } from "@/lib/utils";

export const revalidate = 300;

export default async function HomePage() {
  const [trailsRes, impact] = await Promise.all([
    listTrails({ sort: "popular", limit: 3 }).catch(() => ({ data: [], pagination: { total: 0, limit: 3, offset: 0 } })),
    getImpact().catch(() => null),
  ]);

  const featured = trailsRes.data;

  // Only `measured` metrics belong in the hero — these are facts about the
  // platform, not programme aspirations. Falls back to 0, never to an
  // invented figure.
  const metric = (key: string) =>
    impact?.data.metrics.find((m) => m.key === key && m.kind === "measured")?.value ?? 0;

  const mountains = metric("mountains_mapped");
  const guardians = metric("active_guardians");
  const reports = metric("field_reports");

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-hero-grain">
        <div className="absolute inset-x-0 top-0 -z-10 h-[560px] bg-gradient-to-b from-forest-50 to-transparent" />
        <div className="container grid gap-10 py-16 md:grid-cols-12 md:py-24">
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
                { n: guardians, l: "Registered guardians" },
                { n: reports, l: "Field reports" },
              ].map((s) => (
                <div key={s.l}>
                  <dt className="font-display text-2xl font-semibold md:text-3xl">
                    {formatNumber(s.n)}
                  </dt>
                  <dd className="text-xs text-muted-foreground">{s.l}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="md:col-span-5">
            <div className="relative aspect-[4/5] overflow-hidden rounded-3xl bg-forest-700 bg-topo shadow-xl">
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-forest-900/70" />
              <div className="absolute left-5 top-5 flex size-12 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur">
                <TreePine className="size-5" />
              </div>
              <div className="absolute inset-x-5 bottom-5 text-white">
                <div className="text-xs uppercase tracking-wider opacity-80">Today&rsquo;s focus</div>
                <div className="font-display text-xl font-semibold leading-tight">
                  Pine Ridge reforestation corridor
                </div>
                <div className="mt-1 text-sm opacity-80">
                  2,400 seedlings. 18 volunteers. Sat &amp; Sun.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Quick actions */}
      <section className="container pt-8">
        <div className="grid gap-4 md:grid-cols-4">
          {[
            { href: "/trails", icon: MapPin, title: "Trails", desc: "Distances, elevation, checkpoints." },
            { href: "/dashboard", icon: ShieldCheck, title: "Dashboard", desc: "Checklists, timeline, emergency." },
            { href: "/program", icon: Leaf, title: "Program", desc: "Plant & Protect, bootcamps." },
            { href: "/community", icon: Megaphone, title: "Report", desc: "Damage, waste, hazards." },
          ].map(({ href, icon: Icon, title, desc }) => (
            <Link key={href} href={href} className="group">
              <Card className="h-full transition-all hover:-translate-y-0.5 hover:shadow-md">
                <CardContent className="flex flex-col gap-3 p-5">
                  <div className="flex size-10 items-center justify-center rounded-full bg-forest-50 text-primary">
                    <Icon className="size-5" />
                  </div>
                  <div>
                    <div className="font-display text-base font-semibold">{title}</div>
                    <div className="text-sm text-muted-foreground">{desc}</div>
                  </div>
                  <div className="flex items-center gap-1 text-sm font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
                    Open <ArrowRight className="size-4" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* Storytelling */}
      <section className="container mt-16 grid items-center gap-10 md:grid-cols-2 md:mt-24">
        <div className="relative aspect-[5/4] overflow-hidden rounded-3xl bg-forest-800 bg-topo">
          <div className="absolute inset-0 bg-gradient-to-tr from-forest-900/60 via-transparent to-amber/20" />
          <div className="absolute left-6 top-6 rounded-full bg-white/10 px-3 py-1 text-xs text-white backdrop-blur">
            Our commitment
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
              <p className="text-sm text-muted-foreground">Curated by our ranger partners.</p>
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
          <div className="absolute inset-0 bg-topo opacity-20" />
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
