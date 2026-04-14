import * as React from "react";
import { cn } from "@/lib/utils";

export function BrandMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      aria-hidden="true"
      className={cn("size-7 text-primary", className)}
    >
      <path d="M16 3 L27 22 H20 L16 29 L12 22 H5 Z" fill="currentColor" />
      <circle cx="16" cy="15" r="2.2" className="fill-background" />
    </svg>
  );
}

export function BrandLockup({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <BrandMark />
      <div className="font-display text-sm leading-tight">
        <div className="font-semibold">Forest</div>
        <div className="font-semibold">Guardian</div>
      </div>
    </div>
  );
}
