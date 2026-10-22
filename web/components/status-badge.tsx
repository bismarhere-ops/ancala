import { STATUS_LABEL, STATUS_TONE, trailStatus } from "@/lib/trail-status";
import type { Trail } from "@/lib/types";
import { cn } from "@/lib/utils";

export function StatusBadge({ trail, className }: { trail: Pick<Trail, "plannable" | "accessStatus" | "advisoryLevel">; className?: string }) {
  const s = trailStatus(trail);
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1", STATUS_TONE[s].badge, className)}>
      <span className={cn("size-1.5 rounded-full", STATUS_TONE[s].dot)} />
      {STATUS_LABEL[s]}
    </span>
  );
}
