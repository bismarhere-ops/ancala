import type { Metadata } from "next";
import Link from "next/link";
import { listTrails } from "@/lib/api";
import { TrailCard } from "@/components/trail-card";
import { TrailFilter } from "@/components/trail-filter";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Trails",
  description: "Browse trails with distance, elevation, difficulty, risk and checkpoints.",
};

export const revalidate = 60;

export default async function TrailsPage({
  searchParams,
}: {
  searchParams: { q?: string; difficulty?: string; sort?: string; page?: string };
}) {
  const PAGE_SIZE = 24;
  const page = Math.max(1, Number(searchParams.page) || 1);
  const offset = (page - 1) * PAGE_SIZE;

  const res = await listTrails({
    q: searchParams.q,
    difficulty: searchParams.difficulty,
    sort: searchParams.sort || "popular",
    limit: PAGE_SIZE,
    offset,
  }).catch(() => ({ data: [], pagination: { total: 0, limit: PAGE_SIZE, offset } }));

  const totalPages = Math.max(1, Math.ceil(res.pagination.total / PAGE_SIZE));
  const pageHref = (n: number) => {
    const sp = new URLSearchParams();
    if (searchParams.q) sp.set("q", searchParams.q);
    if (searchParams.difficulty) sp.set("difficulty", searchParams.difficulty);
    if (searchParams.sort) sp.set("sort", searchParams.sort);
    if (n > 1) sp.set("page", String(n));
    const qs = sp.toString();
    return qs ? `/trails?${qs}` : "/trails";
  };

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
          Showing <strong>{res.data.length === 0 ? 0 : offset + 1}–{offset + res.data.length}</strong>{" "}
          of {res.pagination.total} trails
        </div>

        {res.data.length === 0 ? (
          <div className="mt-10 rounded-xl border border-dashed p-12 text-center">
            <h3 className="font-display text-lg font-semibold">No trails match your filters.</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Try clearing filters or searching a different region.
            </p>
          </div>
        ) : (
          <>
            <div className="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {res.data.map((t) => (
                <TrailCard key={t.slug} trail={t} />
              ))}
            </div>

            {totalPages > 1 && (
              <nav
                aria-label="Trail list pagination"
                className="mt-10 flex items-center justify-center gap-2"
              >
                <Button asChild variant="outline" size="sm" disabled={page <= 1}>
                  <Link
                    href={pageHref(page - 1)}
                    aria-disabled={page <= 1}
                    className={page <= 1 ? "pointer-events-none opacity-50" : undefined}
                  >
                    Previous
                  </Link>
                </Button>
                <span className="px-3 text-sm text-muted-foreground">
                  Page {page} of {totalPages}
                </span>
                <Button asChild variant="outline" size="sm" disabled={page >= totalPages}>
                  <Link
                    href={pageHref(page + 1)}
                    aria-disabled={page >= totalPages}
                    className={page >= totalPages ? "pointer-events-none opacity-50" : undefined}
                  >
                    Next
                  </Link>
                </Button>
              </nav>
            )}
          </>
        )}
      </section>
    </>
  );
}
