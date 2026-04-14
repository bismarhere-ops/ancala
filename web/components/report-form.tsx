"use client";

import * as React from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { MapPin, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { submitReport } from "@/lib/api";
import type { Trail } from "@/lib/types";

const schema = z.object({
  type: z.string().min(2, "Pick a report type"),
  trailSlug: z.string().optional(),
  description: z.string().max(2000).optional(),
  severity: z.enum(["low", "medium", "high"]).default("medium"),
  anonymous: z.boolean().default(false),
  reporterName: z.string().optional(),
  reporterEmail: z.string().email().optional().or(z.literal("")),
});

type FormValues = z.infer<typeof schema>;

const TYPES = [
  "Trail damage",
  "Waste / littering",
  "Fallen tree / obstruction",
  "Wildlife hazard",
  "Missing signage",
  "Fire risk",
];

export function ReportForm({ trails }: { trails: Trail[] }) {
  const { control, register, handleSubmit, formState, watch, reset } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { severity: "medium", anonymous: false },
  });
  const anonymous = watch("anonymous");

  const [coords, setCoords] = React.useState<{ lat: number; lng: number } | null>(null);
  const [files, setFiles] = React.useState<File[]>([]);
  const [submitting, setSubmitting] = React.useState(false);

  function useMyLocation() {
    if (!("geolocation" in navigator)) {
      toast.error("Geolocation not available on this device.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        toast.success("Location captured.");
      },
      () => toast.error("Couldn't read your location."),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }

  async function onSubmit(values: FormValues) {
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("type", values.type);
      if (values.trailSlug && values.trailSlug !== "none") fd.append("trailSlug", values.trailSlug);
      if (values.description) fd.append("description", values.description);
      fd.append("severity", values.severity);
      fd.append("anonymous", String(values.anonymous));
      if (!values.anonymous) {
        if (values.reporterName) fd.append("reporterName", values.reporterName);
        if (values.reporterEmail) fd.append("reporterEmail", values.reporterEmail);
      }
      if (coords) {
        fd.append("lat", String(coords.lat));
        fd.append("lng", String(coords.lng));
      }
      files.slice(0, 4).forEach((f) => fd.append("photos", f));

      await submitReport(fd);
      toast.success("Report submitted — thank you for keeping the forest safer.");
      reset();
      setFiles([]);
      setCoords(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong.";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="type">Type</Label>
        <Controller
          control={control}
          name="type"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="type">
                <SelectValue placeholder="Select a type" />
              </SelectTrigger>
              <SelectContent>
                {TYPES.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        {formState.errors.type && (
          <p className="text-xs text-destructive">{formState.errors.type.message}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="trail">Trail</Label>
        <Controller
          control={control}
          name="trailSlug"
          render={({ field }) => (
            <Select value={field.value ?? "none"} onValueChange={field.onChange}>
              <SelectTrigger id="trail">
                <SelectValue placeholder="Choose a trail" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Not specific to one trail</SelectItem>
                {trails.map((t) => (
                  <SelectItem key={t.slug} value={t.slug}>
                    {t.name} · {t.region}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="severity">Severity</Label>
        <Controller
          control={control}
          name="severity"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="severity">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High — needs urgent attention</SelectItem>
              </SelectContent>
            </Select>
          )}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          placeholder="Describe the issue, location markers, severity…"
          rows={4}
          {...register("description")}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="photos">Photos (up to 4)</Label>
        <label
          htmlFor="photos"
          className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed bg-background px-3 py-3 text-sm text-muted-foreground hover:bg-secondary/40"
        >
          <Upload className="size-4" />
          <span className="flex-1">
            {files.length > 0 ? `${files.length} file(s) selected` : "Tap to choose images"}
          </span>
        </label>
        <input
          id="photos"
          type="file"
          accept="image/*"
          multiple
          capture="environment"
          className="hidden"
          onChange={(e) => setFiles(Array.from(e.target.files || []).slice(0, 4))}
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Controller
          control={control}
          name="anonymous"
          render={({ field }) => (
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={field.value}
                onCheckedChange={(v) => field.onChange(Boolean(v))}
              />
              Submit anonymously
            </label>
          )}
        />
        <Button type="button" variant="outline" size="sm" onClick={useMyLocation}>
          <MapPin /> Use my location
        </Button>
        <span className="text-xs text-muted-foreground">
          {coords
            ? `Location: ${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`
            : "Location: not set"}
        </span>
      </div>

      {!anonymous && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="reporterName">Name</Label>
            <Input id="reporterName" {...register("reporterName")} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="reporterEmail">Email</Label>
            <Input id="reporterEmail" type="email" {...register("reporterEmail")} />
          </div>
        </div>
      )}

      <Button type="submit" disabled={submitting} className="w-full sm:w-auto">
        {submitting ? "Submitting…" : "Submit report"}
      </Button>
    </form>
  );
}
