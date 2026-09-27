"use client";

import * as React from "react";
import Link from "next/link";
import { Monitor, Navigation, Smartphone, X } from "lucide-react";

/**
 * Development-only floating switcher between the three designed views.
 * The mobile view opens in a 390×844 frame. Not rendered in production.
 */
export function DevPreviewSwitcher() {
  const [phone, setPhone] = React.useState(false);
  if (process.env.NODE_ENV !== "development") return null;
  const mobileUrl = "/trails/rinjani/telemetry?demo=1";

  return (
    <>
      <div className="fixed bottom-4 left-1/2 z-[1000] flex -translate-x-1/2 gap-1 rounded-full bg-forest-900/95 p-1 text-xs font-semibold text-white shadow-lg ring-1 ring-white/10">
        <Link href="/trails" className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 hover:bg-white/10">
          <Monitor className="size-3.5" /> Web directory
        </Link>
        <Link href="/trails/rinjani/telemetry" className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 hover:bg-white/10">
          <Navigation className="size-3.5" /> Web topo telemetry
        </Link>
        <button onClick={() => setPhone(true)} className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 hover:bg-white/10">
          <Smartphone className="size-3.5" /> Mobile field HUD
        </button>
      </div>
      {phone && (
        <div className="fixed inset-0 z-[1001] flex items-center justify-center bg-black/60 p-4" onClick={() => setPhone(false)}>
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setPhone(false)}
              aria-label="Close preview"
              className="absolute -right-3 -top-3 z-10 rounded-full bg-white p-1 text-black shadow"
            >
              <X className="size-4" />
            </button>
            <iframe
              src={mobileUrl}
              title="Mobile field HUD preview"
              className="h-[844px] max-h-[90vh] w-[390px] rounded-[2rem] border-8 border-black bg-black"
            />
          </div>
        </div>
      )}
    </>
  );
}
