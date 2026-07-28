import type { Metadata } from "next";
import Link from "next/link";
import { EMPTY_TRAIL_LIST, TRAIL_PAGE_SIZE, listTrails } from "@/lib/api";
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
  searchParams: Record<string, string | undefined>;
}) {
  const page = Math.max(1, Number(searchParams.page) || 1);
  const offset = (page - 1) * TRAIL_PAGE_SIZE;

  const res = await listTrails({
    q: searchParams.q,
    difficulty: searchParams.difficulty,
    sort: searchParams.sort || "popular",
    limit: TRAIL_PAGE_SIZE,
    offset,
  }).catch(() => EMPTY_TRAIL_LIST);

  const totalPages = Math.max(1, Math.ceil(res.pagination.total / TRAIL_PAGE_SIZE));

  // Copy every incoming param so filters added later survive pagination.
  const pageHref = (n: number) => {
    const sp = new URLSearchParams(
      Object.entries(searchParams).filter(([k, v]) => v && k !== "page") as [string, string][]
    );
    if (n > 1) sp.set("page", String(n));
    const qs = sp.toString();
    return qs ? `/trails?${qs}` : "/trails";
  };

  const PageLink = ({ to, label, disabled }: { to: number; label: string; disabled: boolean }) => (
    <Button asChild variant="outline" size="sm">
      <Link
        href={pageHref(to)}
        aria-disabled={disabled}
        tabIndex={disabled ? -1 : undefined}
        className={disabled ? "pointer-events-none opacity-50" : undefined}
      >
        {label}
      </Link>
    </Button>
  );

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
                <PageLink to={page - 1} label="Previous" disabled={page <= 1} />
                <span className="px-3 text-sm text-muted-foreground">
                  Page {page} of {totalPages}
                </span>
                <PageLink to={page + 1} label="Next" disabled={page >= totalPages} />
              </nav>
            )}
          </>
        )}
      </section>
    </>
  );
}
