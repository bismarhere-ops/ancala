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
            Offline-ready
          </h4>
          <p className="text-sm text-forest-200">
            Every trail page ships a downloadable JSON guide for low-signal hiking — save it to
            your phone before you go.
          </p>
        </div>
      </div>
      <div className="border-t border-forest-800">
        <div className="container flex flex-col items-start justify-between gap-2 py-6 text-xs text-forest-200 md:flex-row md:items-center">
          <span>© {new Date().getFullYear()} Forest Guardian CSR</span>
          <span>Hike. Protect. Restore.</span>
        </div>
      </div>
    </footer>
  );
}
