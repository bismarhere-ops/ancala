import Image from "next/image";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Full-bleed page header over a real mountain photo. The gradient keeps the
 * white text readable on bright skies; the credit sits in the corner.
 */
export function PhotoHero({
  src,
  credit,
  eyebrow,
  title,
  children,
  position = "center",
  className,
}: {
  src: string;
  credit?: string | null;
  eyebrow?: ReactNode;
  title: ReactNode;
  children?: ReactNode;
  /** CSS object-position, to keep the subject in frame. */
  position?: string;
  className?: string;
}) {
  return (
    <section className={cn("relative isolate overflow-hidden bg-forest-900 text-white", className)}>
      <Image
        src={src}
        alt=""
        fill
        priority
        sizes="100vw"
        className="-z-10 object-cover"
        style={{ objectPosition: position }}
      />
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-black/75 via-black/45 to-black/10" />
      <div className="absolute inset-x-0 bottom-0 -z-10 h-1/3 bg-gradient-to-t from-black/50 to-transparent" />
      <div className="container flex min-h-[340px] flex-col justify-end py-12 md:min-h-[440px] md:py-16">
        {eyebrow && (
          <div className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-amber-300">{eyebrow}</div>
        )}
        <h1 className="max-w-3xl font-display text-4xl font-semibold leading-[1.05] tracking-tight text-balance drop-shadow md:text-6xl">
          {title}
        </h1>
        {children && <div className="mt-4 max-w-2xl text-white/85">{children}</div>}
      </div>
      {credit && (
        <span className="absolute bottom-2 right-3 max-w-[60%] truncate text-[10px] text-white/60">{credit}</span>
      )}
    </section>
  );
}
