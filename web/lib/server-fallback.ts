import { unstable_noStore as noStore } from "next/cache";

/**
 * Catch handler for server-side API calls: logs the failure and returns
 * `value`, but also opts this render out of the page cache. Otherwise an API
 * outage, or a build that runs before the API is reachable, would be saved as
 * the page and served (with empty data) until the next revalidation succeeds.
 *
 * Server components only; importing next/cache into client code breaks it.
 */
export function fallback<T>(value: T, label: string) {
  return (err: unknown): T => {
    console.error(`[api] ${label} failed:`, err instanceof Error ? err.message : err);
    noStore();
    return value;
  };
}
