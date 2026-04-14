"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrandLockup } from "@/components/brand-mark";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/trails", label: "Trails" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/program", label: "Program" },
  { href: "/community", label: "Community" },
];

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
      <div className="container flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center" aria-label="Forest Guardian">
          <BrandLockup />
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-6 md:flex">
          {nav.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "text-sm font-medium transition-colors hover:text-primary",
                  active ? "text-primary" : "text-foreground/80"
                )}
              >
                {item.label}
              </Link>
            );
          })}
          <Button asChild size="sm">
            <Link href="/community#volunteer">Join as Guardian</Link>
          </Button>
        </nav>

        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          aria-expanded={open}
          aria-controls="mobile-nav"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X /> : <Menu />}
          <span className="sr-only">Toggle menu</span>
        </Button>
      </div>

      {open && (
        <div id="mobile-nav" className="border-t bg-background md:hidden">
          <nav className="container flex flex-col gap-1 py-3" aria-label="Mobile">
            {nav.map((item) => {
              const active = pathname === item.href || pathname.startsWith(item.href + "/");
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
            <Button asChild className="mt-2 w-full">
              <Link href="/community#volunteer">Join as Guardian</Link>
            </Button>
          </nav>
        </div>
      )}
    </header>
  );
}
