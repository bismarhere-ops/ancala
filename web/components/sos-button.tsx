"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { LifeBuoy, MessageSquare, Phone, Radio, Share2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { getPositionOnce, type GpsFix } from "@/lib/use-gps";
import { formatCoords, mapsLink } from "@/lib/geo";
import { cn } from "@/lib/utils";

/**
 * Emergency help. It does not "broadcast" anything by itself: it opens the
 * phone's dialer for 112 (national emergency) or 115 (Basarnas search and
 * rescue), and prepares a text with the hiker's GPS position that they send
 * to anyone. Calls and SMS work on basic cell signal with no internet.
 */
export function SosButton({ className, compact = false }: { className?: string; compact?: boolean }) {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);
  const [fix, setFix] = React.useState<GpsFix | null>(null);
  const [locating, setLocating] = React.useState(false);

  // "/trails/rinjani" or "/trails/rinjani/telemetry" -> "rinjani"
  const trail = pathname.match(/^\/trails\/([^/]+)/)?.[1] ?? null;

  React.useEffect(() => {
    if (!open) return;
    setLocating(true);
    getPositionOnce().then((f) => {
      setFix(f);
      setLocating(false);
    });
  }, [open]);

  const message = [
    "SOS - I need help.",
    trail ? `Trail: ${trail}.` : null,
    fix ? `My position: ${fix.lat.toFixed(5)}, ${fix.lng.toFixed(5)} (±${Math.round(fix.accuracy)} m)` : "My position is unknown (no GPS fix).",
    fix?.altitude != null ? `Altitude ~${Math.round(fix.altitude)} m.` : null,
    fix ? mapsLink(fix) : null,
  ]
    .filter(Boolean)
    .join(" ");

  const share = async () => {
    try {
      await navigator.share({ title: "SOS", text: message });
    } catch {
      /* cancelled */
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md bg-destructive px-2.5 py-1.5 text-xs font-bold tracking-wider text-white shadow-sm hover:bg-destructive/90",
            className
          )}
        >
          <Radio className="size-3.5" /> SOS
          {!compact && <span className="sr-only">Emergency help</span>}
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <LifeBuoy className="size-5" /> Emergency help
          </DialogTitle>
          <DialogDescription>
            Calls and text messages work on basic signal, without internet. Stay where you are if
            you can, and keep your phone warm to save battery.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border bg-muted/50 p-3 text-sm">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Your position
          </div>
          {locating ? (
            <p className="mt-1">Getting a GPS fix…</p>
          ) : fix ? (
            <>
              <p className="mt-1 font-mono text-base font-semibold tabular-nums">{formatCoords(fix)}</p>
              <p className="font-mono text-xs tabular-nums text-muted-foreground">
                {fix.lat.toFixed(5)}, {fix.lng.toFixed(5)} · ±{Math.round(fix.accuracy)} m
                {fix.altitude != null && ` · ${Math.round(fix.altitude)} m altitude`}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">Read these numbers to the operator.</p>
            </>
          ) : (
            <p className="mt-1">
              No GPS fix. Allow location access, or describe the nearest checkpoint to the operator.
            </p>
          )}
        </div>

        <div className="grid gap-2">
          <Button asChild size="lg" variant="destructive" className="h-12 text-base">
            <a href="tel:112">
              <Phone /> Call 112 (emergency)
            </a>
          </Button>
          <Button asChild size="lg" variant="outline" className="h-11">
            <a href="tel:115">
              <Phone /> Call 115 (Basarnas search &amp; rescue)
            </a>
          </Button>
          <Button asChild size="lg" variant="outline" className="h-11">
            <a href={`sms:?&body=${encodeURIComponent(message)}`}>
              <MessageSquare /> Text my location to a contact
            </a>
          </Button>
          {typeof navigator !== "undefined" && "share" in navigator && (
            <Button size="lg" variant="ghost" className="h-11" onClick={share}>
              <Share2 /> Share my location
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
