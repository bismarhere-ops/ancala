"use client";

import * as React from "react";
import { Phone, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { usePlan } from "@/components/plan-provider";

const STORAGE_KEY = "fg.emergency.v1";

/**
 * Only numbers we can actually stand behind are dialable. 112 is Indonesia's
 * national emergency line. Mountain-specific contacts come from the dataset
 * per trail; where the source recorded none, we say so rather than offering a
 * button that reaches nothing.
 */
const NATIONAL_EMERGENCY = {
  name: "Emergency services (national)",
  sub: "Police, ambulance, search & rescue",
  tel: "112",
};

export function EmergencyPanel() {
  const { trail } = usePlan();
  const localContact = trail?.profile?.safety.emergencyContact ?? null;
  const signal = trail?.profile?.facilities.signalCoverage ?? null;

  const [mine, setMine] = React.useState("");
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    setMine(window.localStorage.getItem(STORAGE_KEY) || "");
  }, []);
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, mine);
  }, [mine]);

  return (
    <Card className="border-destructive/20 bg-destructive/[0.02]">
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <ShieldAlert className="size-5 text-destructive" /> Emergency
        </CardTitle>
        <Badge variant="destructive">112 · 24/7</Badge>
      </CardHeader>
      <CardContent className="space-y-3">
        <ul className="divide-y">
          <li className="flex items-center justify-between gap-3 py-3">
            <div>
              <div className="text-sm font-medium">{NATIONAL_EMERGENCY.name}</div>
              <div className="text-xs text-muted-foreground">{NATIONAL_EMERGENCY.sub}</div>
            </div>
            <Button asChild size="sm" variant="destructive">
              <a href={`tel:${NATIONAL_EMERGENCY.tel}`}>
                <Phone /> 112
              </a>
            </Button>
          </li>

          <li className="py-3">
            <div className="text-sm font-medium">
              {trail ? `Local rescue — ${trail.name}` : "Local rescue"}
            </div>
            {localContact ? (
              <p className="mt-1 text-xs text-muted-foreground">{localContact}</p>
            ) : (
              <p className="mt-1 text-xs italic text-muted-foreground/70">
                {trail
                  ? "No basecamp contact recorded for this mountain. Register at the basecamp on arrival and note their number."
                  : "Select a trail in the planner to see its rescue contact."}
              </p>
            )}
          </li>

          {signal && (
            <li className="py-3">
              <div className="text-sm font-medium">Signal coverage</div>
              <p className="mt-1 text-xs text-muted-foreground">{signal}</p>
            </li>
          )}
        </ul>
        <div className="space-y-1.5">
          <Label htmlFor="my-emergency">My emergency contact</Label>
          <Input
            id="my-emergency"
            type="tel"
            inputMode="tel"
            placeholder="+00 000 000 000"
            value={mine}
            onChange={(e) => setMine(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">Stored only on this device.</p>
        </div>
      </CardContent>
    </Card>
  );
}
