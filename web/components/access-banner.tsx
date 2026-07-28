import { OctagonAlert, TriangleAlert } from "lucide-react";
import type { AccessStatus } from "@/lib/types";
import { ACCESS_COPY } from "@/lib/access";

/**
 * Surfaced above the fold on trail pages. `open` renders nothing so the
 * banner never becomes visual noise a hiker learns to skip.
 */
export function AccessBanner({ status }: { status: AccessStatus | null }) {
  if (!status || status === "open") return null;

  const { title, body } = ACCESS_COPY[status];
  const closed = status === "closed";
  const Icon = closed ? OctagonAlert : TriangleAlert;

  return (
    <div
      role="alert"
      className={
        closed
          ? "rounded-xl border border-red-300 bg-red-50 p-4 text-red-900"
          : "rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-900"
      }
    >
      <div className="flex items-start gap-3">
        <Icon className="mt-0.5 size-5 shrink-0" />
        <div>
          <div className="font-display text-sm font-semibold">{title}</div>
          <p className="mt-1 text-sm opacity-90">{body}</p>
        </div>
      </div>
    </div>
  );
}

/** Compact form for cards and list rows. */
export function AccessBadge({ status }: { status: AccessStatus | null }) {
  if (!status || status === "open") return null;
  const closed = status === "closed";
  return (
    <span
      className={
        closed
          ? "rounded-full bg-red-600 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-white"
          : "rounded-full bg-amber-500 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-amber-950"
      }
    >
      {ACCESS_COPY[status].badge}
    </span>
  );
}
