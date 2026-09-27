import Link from "next/link";
import { BrandLockup } from "@/components/brand-mark";

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t bg-forest-900 text-forest-100">
      <div className="container grid gap-10 py-12 md:grid-cols-4">
        <div>
          <div className="text-white">
            <BrandLockup />
          </div>
          <p className="mt-4 text-sm text-forest-200">
            A corporate social responsibility program by a furniture brand rooted in the forest.
          </p>
        </div>
        <div>
          <h4 className="mb-3 font-display text-sm font-semibold uppercase tracking-wider text-white">
            Explore
          </h4>
          <ul className="space-y-2 text-sm text-forest-200">
            <li><Link className="hover:text-white" href="/trails">Trails</Link></li>
            <li><Link className="hover:text-white" href="/dashboard">Hiker Dashboard</Link></li>
            <li><Link className="hover:text-white" href="/program">Program</Link></li>
            <li><Link className="hover:text-white" href="/community">Community</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="mb-3 font-display text-sm font-semibold uppercase tracking-wider text-white">
            Engage
          </h4>
          <ul className="space-y-2 text-sm text-forest-200">
            <li><Link className="hover:text-white" href="/community#volunteer">Volunteer</Link></li>
            <li><Link className="hover:text-white" href="/community#report">Report a trail</Link></li>
            <li><Link className="hover:text-white" href="/program#impact">Impact report</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="mb-3 font-display text-sm font-semibold uppercase tracking-wider text-white">
            Leave No Trace
          </h4>
          <ul className="space-y-1.5 text-sm text-forest-200">
            <li>Plan ahead and check live closures</li>
            <li>Stay on marked trails and camps</li>
            <li>Carry out all rubbish</li>
            <li>Leave what you find</li>
            <li>Minimise fire; none in dry season</li>
            <li>Respect wildlife and sacred sites</li>
          </ul>
        </div>
      </div>
      <div className="container pb-8">
        <div className="flex flex-col gap-3 rounded-xl border border-forest-800 bg-forest-800/40 p-4 text-sm md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <span className="rounded-md bg-telemetry/15 px-2 py-1 font-mono text-[11px] font-semibold uppercase tracking-wider text-telemetry">
              Low-bandwidth field protocol
            </span>
            <span className="text-forest-200">
              Pages, guides and maps are saved on your phone with offline packs. No signal needed on the trail.
            </span>
          </div>
          <Link href="/community#volunteer" className="shrink-0 font-semibold text-white hover:underline">
            Volunteer as a ranger →
          </Link>
        </div>
      </div>
      <div className="border-t border-forest-800">
        <div className="container flex flex-col items-start justify-between gap-2 py-6 text-xs text-forest-200 md:flex-row md:items-center">
          <span>© 2026 Forest Guardian CSR · Alpine stewardship</span>
          <span>Hike. Protect. Restore.</span>
        </div>
      </div>
    </footer>
  );
}
