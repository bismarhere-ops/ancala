"use client";

import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

/** Hides site-wide chrome on phones for the full-screen field HUD. */
export function ChromeGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const field = /^\/trails\/[^/]+\/telemetry$/.test(pathname);
  return <div className={cn(field && "max-lg:hidden")}>{children}</div>;
}
