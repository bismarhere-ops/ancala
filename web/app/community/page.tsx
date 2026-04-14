import type { Metadata } from "next";
import Link from "next/link";
import { Flag, UserRoundPlus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ReportForm } from "@/components/report-form";
import { VolunteerForm } from "@/components/volunteer-form";
import { listReports, listTrails } from "@/lib/api";
import { cn, riskColor } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Community",
  description: "Report trail conditions, share photos, register as a volunteer.",
};

export const revalidate = 30;

export default async function CommunityPage() {
  const [trailsRes, reportsRes] = await Promise.all([
    listTrails({ sort: "name", limit: 50 }).catch(() => ({
      data: [],
      pagination: { total: 0, limit: 50, offset: 0 },
    })),
    listReports({ limit: 6 }).catch(() => ({ data: [] })),
  ]);

  return (
    <>
      <section className="bg-forest-50">
        <div className="container py-12 md:py-16">
          <div className="mb-2 text-xs font-medium uppercase tracking-wider text-primary">
            Community &amp; Reporting
          </div>
          <h1 className="font-display text-4xl font-semibold tracking-tight md:text-5xl">
            The forest needs eyes on the ground.
          </h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Report a hazard, share a sighting, or register to volunteer. Every contribution makes
            the next hiker safer and the forest stronger.
          </p>
        </div>
      </section>

      {/* Report */}
      <section id="report" className="container py-12">
        <div className="grid gap-10 md:grid-cols-2">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-primary">
              <Flag className="size-4" /> Trail report
            </div>
            <h2 className="font-display text-3xl font-semibold tracking-tight md:text-4xl">
              Spotted something?
            </h2>
            <p className="mt-3 max-w-md text-muted-foreground">
              Report damage, waste, or a hazard. Reports queue while offline and send when you
              regain signal.
            </p>
            <ul className="mt-5 space-y-2 text-sm">
              {[
                "Geo-tag with your current position",
                "Attach up to 4 photos",
                "Anonymous or signed submission",
              ].map((x) => (
                <li key={x} className="flex items-center gap-2">
                  <span className="size-1.5 rounded-full bg-primary" /> {x}
                </li>
              ))}
            </ul>
          </div>
          <Card>
            <CardContent className="p-6">
              <ReportForm trails={trailsRes.data} />
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Recent reports */}
      <section className="bg-secondary/40">
        <div className="container py-12">
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <h2 className="font-display text-2xl font-semibold tracking-tight">
                Recent community reports
              </h2>
              <p className="text-sm text-muted-foreground">The latest from the field.</p>
            </div>
            <Link href="#report" className="text-sm font-medium text-primary">
              Add a report →
            </Link>
          </div>
          {reportsRes.data.length === 0 ? (
            <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
              No reports yet. Be the first eyes on the ground.
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {reportsRes.data.map((r) => (
                <Card key={r.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">{r.type}</CardTitle>
                      <span className="inline-flex items-center gap-1 text-xs capitalize text-muted-foreground">
                        <span className={cn("size-1.5 rounded-full", riskColor(r.severity))} />
                        {r.severity}
                      </span>
                    </div>
                    {r.trail && (
                      <div className="text-xs text-muted-foreground">
                        {r.trail.name}
                      </div>
                    )}
                  </CardHeader>
                  <CardContent>
                    {r.description && (
                      <p className="line-clamp-3 text-sm text-muted-foreground">{r.description}</p>
                    )}
                    {r.photos.length > 0 && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={r.photos[0]}
                        alt=""
                        className="mt-3 aspect-video w-full rounded-md object-cover"
                      />
                    )}
                    <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                      <span>{new Date(r.createdAt).toLocaleString()}</span>
                      <Badge variant="outline">{r.anonymous ? "Anonymous" : "Signed"}</Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Volunteer */}
      <section id="volunteer" className="container py-16">
        <div className="grid gap-10 md:grid-cols-2">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-primary">
              <UserRoundPlus className="size-4" /> Volunteer
            </div>
            <h2 className="font-display text-3xl font-semibold tracking-tight md:text-4xl">
              Become a guardian.
            </h2>
            <p className="mt-3 max-w-md text-muted-foreground">
              Volunteer for planting days, trail clean-ups, or the Guardian Bootcamp. We&rsquo;ll match
              you with nearby programs.
            </p>
            <Separator className="my-6" />
            <div className="flex flex-wrap gap-2">
              {["Flexible hours", "Certified training", "Community events"].map((b) => (
                <Badge key={b} variant="secondary">{b}</Badge>
              ))}
            </div>
          </div>
          <Card>
            <CardContent className="p-6">
              <VolunteerForm />
            </CardContent>
          </Card>
        </div>
      </section>
    </>
  );
}
