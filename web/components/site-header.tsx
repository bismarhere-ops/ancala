"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Search, UserRound, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrandLockup } from "@/components/brand-mark";
import { OfflinePill } from "@/components/offline-pill";
import { SosButton } from "@/components/sos-button";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/trails", label: "Trails" },
  { href: "/trails?view=map", label: "Topo Map", match: "/map" },
  { href: "/telemetry", label: "Telemetry" },
  { href: "/dashboard", label: "Hiker Dashboard" },
  { href: "/program", label: "Program" },
  { href: "/community", label: "Community" },
];

function isActive(pathname: string, href: string) {
  const path = href.split("?")[0];
  if (href.includes("?")) return false; // query-based views don't own a route
  if (path === "/trails") return pathname === "/trails" || /^\/trails\/[^/]+$/.test(pathname);
  if (path === "/telemetry") return pathname === "/telemetry" || pathname.endsWith("/telemetry");
  return pathname === path || pathname.startsWith(path + "/");
}

function HeaderSearch({ className }: { className?: string }) {
  return (
    <form action="/trails" className={cn("relative", className)} role="search">
      <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <input
        name="q"
        type="search"
        placeholder="Search trails, peaks…"
        aria-label="Search trails and peaks"
        className="h-9 w-full rounded-md border bg-card pl-8 pr-3 text-sm outline-none ring-ring placeholder:text-muted-foreground focus-visible:ring-2"
      />
    </form>
  );
}

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);
  const [scrolled, setScrolled] = React.useState(false);

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  React.useEffect(() => setOpen(false), [pathname]);

  return (
    <header
      className={cn(
        "sticky top-0 z-40 w-full border-b transition-colors",
        scrolled
          ? "border-border/70 bg-background/85 backdrop-blur"
          : "border-transparent bg-background"
      )}
    >
      <div className="container flex h-16 items-center justify-between gap-4">
        <Link href="/" className="flex items-center" aria-label="Forest Guardian">
          <BrandLockup />
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-5 lg:flex">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "whitespace-nowrap text-sm font-medium transition-colors hover:text-primary",
                isActive(pathname, item.href) ? "text-primary" : "text-foreground/75"
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <HeaderSearch className="hidden w-44 xl:block" />
          <OfflinePill className="hidden sm:inline-flex" />
          <SosButton />
          <Link
            href="/dashboard"
            aria-label="Hiker profile and dashboard"
            className="hidden size-9 items-center justify-center rounded-full bg-secondary text-primary hover:bg-secondary/70 lg:inline-flex"
          >
            <UserRound className="size-4" />
          </Link>

        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          aria-expanded={open}
          aria-controls="mobile-nav"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X /> : <Menu />}
          <span className="sr-only">Toggle menu</span>
        </Button>
        </div>
      </div>

      {open && (
        <div id="mobile-nav" className="border-t bg-background lg:hidden">
          <nav className="container flex flex-col gap-1 py-3" aria-label="Mobile">
            <HeaderSearch className="mb-2" />
            {nav.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "rounded-md px-3 py-2.5 text-sm font-medium",
                    active
                      ? "bg-secondary text-primary"
                      : "text-foreground/80 hover:bg-secondary"
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
            <OfflinePill className="mt-2 self-start sm:hidden" />
          </nav>
        </div>
      )}
    </header>
  );
}
