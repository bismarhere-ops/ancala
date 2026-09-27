import type { Metadata } from "next";
import { Suspense } from "react";
import { listAllTrails } from "@/lib/api";
import { fallback } from "@/lib/server-fallback";
import { TrailDirectory } from "@/components/trail-directory";

export const metadata: Metadata = {
  title: "Trails",
  description:
    "Every mountain on an archipelago map, with distance, elevation, difficulty, live closures and offline field packs.",
};

export const revalidate = 60;

/**
 * All 50 routes are sent once and filtered in the browser, so search, island
 * tabs and the map respond instantly and the same list works from the offline
 * pack.
 */
export default async function TrailsPage() {
  const trails = await listAllTrails({ sort: "popular" }).catch(fallback([], "trails"));

  return (
    // useSearchParams inside the directory needs a Suspense boundary.
    <Suspense>
      <TrailDirectory initialTrails={trails} />
    </Suspense>
  );
}
