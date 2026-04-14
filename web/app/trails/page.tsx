import type { Metadata } from "next";
import { listTrails } from "@/lib/api";
import { TrailCard } from "@/components/trail-card";
import { TrailFilter } from "@/components/trail-filter";

export const metadata: Metadata = {
  title: "Trails",
  description: "Browse trails with distance, elevation, difficulty, risk and checkpoints.",
};

export const revalidate = 60;

export default async function TrailsPage({
  searchParams,
}: {
  searchParams: { q?: string; difficulty?: string; sort?: string };
}) {
  const res = await listTrails({
    q: searchParams.q,
    difficulty: searchParams.difficulty,
    sort: searchParams.sort || "popular",
    limit: 50,
  }).catch(() => ({ data: [], pagination: { total: 0, limit: 50, offset: 0 } }));

  return (
    <>
      <section className="bg-forest-50">
        <div className="container py-12 md:py-16">
          <div className="mb-2 text-xs font-medium uppercase tracking-wider text-primary">
            Trail Information System
          </div>
          <h1 className="font-display text-4xl font-semibold tracking-tight md:text-5xl">
            Find the right trail, prepared.
          </h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Distances, elevations, checkpoints, risk and live weather — in one lightweight guide
            designed for low-signal conditions.
          </p>
        </div>
      </section>

      <section className="container py-10">
        <TrailFilter />

        <div className="mt-6 text-sm text-muted-foreground">
          Showing <strong>{res.data.length}</strong> of {res.pagination.total} trails
        </div>

        {res.data.length === 0 ? (
          <div className="mt-10 rounded-xl border border-dashed p-12 text-center">
            <h3 className="font-display text-lg font-semibold">No trails match your filters.</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Try clearing filters or searching a different region.
            </p>
          </div>
        ) : (
          <div className="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {res.data.map((t) => (
              <TrailCard key={t.slug} trail={t} />
            ))}
          </div>
        )}
      </section>
    </>
  );
}
