import { OctagonAlert, TriangleAlert } from "lucide-react";
import type { AccessStatus } from "@/lib/types";

const COPY: Record<
  Exclude<AccessStatus, "open">,
  { title: string; body: string }
> = {
  closed: {
    title: "Closed to hikers",
    body: "This mountain is inside an enforced exclusion zone. Do not attempt to climb it. It is listed here for conservation and awareness only.",
  },
  conditional: {
    title: "Access depends on the volcanic alert level",
    body: "This route closes without notice when activity rises. Check the current PVMBG/BPPTKG status before you travel, and again before you set off.",
  },
};

/**
 * Surfaced above the fold on trail pages. `open` renders nothing so the
 * banner never becomes visual noise a hiker learns to skip.
 */
export function AccessBanner({ status }: { status: AccessStatus | null }) {
  if (!status || status === "open") return null;

  const { title, body } = COPY[status];
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
