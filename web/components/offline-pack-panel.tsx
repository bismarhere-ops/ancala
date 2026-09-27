"use client";

import * as React from "react";
import { CheckCircle2, Download, HardDrive, Trash2, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  clearPacks,
  downloadAllPacks,
  formatBytes,
  useOfflineSim,
  usePackMeta,
} from "@/lib/offline";
import { cn } from "@/lib/utils";

export function OfflinePackPanel({ slugs, className }: { slugs: string[]; className?: string }) {
  const pack = usePackMeta();
  const [sim, setSim] = useOfflineSim();
  const [open, setOpen] = React.useState(false);
  const [progress, setProgress] = React.useState({ done: 0, total: 1, bytes: 0 });
  const [running, setRunning] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const start = async () => {
    setOpen(true);
    setRunning(true);
    setError(null);
    try {
      if (typeof caches === "undefined") throw new Error("This browser can't store offline data.");
      await downloadAllPacks(slugs, (done, total, bytes) => setProgress({ done, total, bytes }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Download failed.");
    } finally {
      setRunning(false);
    }
  };

  const pct = Math.round((progress.done / progress.total) * 100);

  return (
    <div
      id="offline"
      className={cn(
        "flex scroll-mt-24 flex-col gap-3 rounded-xl border bg-card p-4 sm:flex-row sm:items-center sm:justify-between",
        className
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary">
          <HardDrive className="size-5" />
        </div>
        <div>
          <div className="font-semibold">Offline field packs</div>
          <p className="text-sm text-muted-foreground">
            {pack
              ? `Saved on this device: ${pack.trails} routes, ${formatBytes(pack.bytes)} · ${new Date(pack.savedAt).toLocaleDateString()}`
              : `Save all ${slugs.length} routes (data, offline guides and pages) for no-signal use.`}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-1.5 text-xs font-medium">
          <input
            type="checkbox"
            className="accent-[#2d5a3d]"
            checked={sim}
            onChange={(e) => setSim(e.target.checked)}
          />
          <WifiOff className="size-3.5" /> Offline simulation
        </label>
        {pack && (
          <Button variant="ghost" size="sm" onClick={() => clearPacks()} aria-label="Delete offline packs">
            <Trash2 />
          </Button>
        )}
        <Button size="sm" onClick={start} disabled={running}>
          <Download /> {pack ? "Update packs" : `Download all ${slugs.length} packs`}
        </Button>
      </div>

      <Dialog open={open} onOpenChange={(o) => !running && setOpen(o)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{running ? "Downloading field packs…" : error ? "Download stopped" : "Packs saved"}</DialogTitle>
            <DialogDescription>
              {error ??
                (running
                  ? "Keep this page open. Each route's data, offline guide and pages are saved to this device."
                  : "Routes are now readable with no signal. Update them before each trip for the latest conditions.")}
            </DialogDescription>
          </DialogHeader>
          <Progress value={pct} />
          <div className="flex justify-between font-mono text-xs tabular-nums text-muted-foreground">
            <span>
              {progress.done}/{progress.total} files
            </span>
            <span>{formatBytes(progress.bytes)}</span>
          </div>
          {!running && !error && (
            <div className="flex items-center gap-2 text-sm text-primary">
              <CheckCircle2 className="size-4" /> {pack ? formatBytes(pack.bytes) : ""} stored offline
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
