"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { AccessBanner } from "@/components/access-banner";
import { AdvisoryBanner } from "@/components/advisory-banner";
import { usePlan } from "@/components/plan-provider";
import { formatMinutes } from "@/lib/utils";

function addMinutes(time: string, minutesToAdd: number) {
  const [hh, mm] = time.split(":").map(Number);
  const base = new Date();
  base.setHours(hh || 0, mm || 0, 0, 0);
  base.setMinutes(base.getMinutes() + minutesToAdd);
  return base.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function TripPlanner() {
  // Plan state lives in PlanProvider so the emergency panel can react to the
  // selected mountain.
  const { plan, setPlan, plannable, trail } = usePlan();

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>Trip planner</CardTitle>
        <Badge variant="secondary">Auto-saved</Badge>
      </CardHeader>
      <CardContent className="space-y-5">
        {trail?.advisories && trail.advisories.length > 0 && (
          <AdvisoryBanner advisories={trail.advisories} />
        )}
        {trail?.requiresAlertCheck && <AccessBanner status="conditional" />}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="plan-trail">Trail</Label>
            <Select value={plan.slug} onValueChange={(v) => setPlan((p) => ({ ...p, slug: v }))}>
              <SelectTrigger id="plan-trail">
                <SelectValue placeholder="Choose a trail" />
              </SelectTrigger>
              <SelectContent>
                {plannable.map((t) => (
                  <SelectItem key={t.slug} value={t.slug}>
                    {t.name} · {t.region}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="plan-date">Date</Label>
            <Input
              id="plan-date"
              type="date"
              value={plan.date}
              onChange={(e) => setPlan((p) => ({ ...p, date: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="plan-start">Start time</Label>
            <Input
              id="plan-start"
              type="time"
              value={plan.start}
              onChange={(e) => setPlan((p) => ({ ...p, start: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="plan-group">Group size</Label>
            <Input
              id="plan-group"
              type="number"
              min={1}
              max={50}
              value={plan.group}
              onChange={(e) => setPlan((p) => ({ ...p, group: Number(e.target.value) || 1 }))}
            />
          </div>
        </div>

        {trail ? (
          <div>
            <div className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Estimated timeline
            </div>
            <ol className="relative space-y-4 border-l-2 border-forest-100 pl-5">
              {trail.checkpoints.map((cp, i) => (
                <li key={i} className="relative">
                  <span className="absolute -left-[26px] top-1 size-3 rounded-full border-2 border-primary bg-background" />
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="font-display text-sm font-semibold">{cp.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {addMinutes(plan.start, cp.etaMin ?? 0)}
                      {cp.etaMin != null && ` · +${formatMinutes(cp.etaMin)}`}
                    </span>
                  </div>
                  {cp.notes && <p className="mt-0.5 text-xs text-muted-foreground">{cp.notes}</p>}
                </li>
              ))}
            </ol>
            <div className="mt-4 rounded-md bg-forest-50 p-3 text-xs text-primary">
              Plan auto-saves to this device. Works without signal.
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Pick a trail to generate a timeline.</p>
        )}
      </CardContent>
    </Card>
  );
}
