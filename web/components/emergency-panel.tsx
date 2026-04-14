"use client";

import * as React from "react";
import { Phone, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

const STORAGE_KEY = "fg.emergency.v1";

const contacts = [
  { name: "Mountain Rescue (national)", sub: "Search & rescue dispatch", tel: "112", urgent: true },
  { name: "Park Ranger Hotline", sub: "Trail hazards & closures", tel: "+10000000001" },
  { name: "Forest Guardian Support", sub: "Community & reporting desk", tel: "+10000000002" },
];

export function EmergencyPanel() {
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
        <Badge variant="destructive">24/7</Badge>
      </CardHeader>
      <CardContent className="space-y-3">
        <ul className="divide-y">
          {contacts.map((c) => (
            <li key={c.name} className="flex items-center justify-between gap-3 py-3">
              <div>
                <div className="text-sm font-medium">{c.name}</div>
                <div className="text-xs text-muted-foreground">{c.sub}</div>
              </div>
              <Button asChild size="sm" variant={c.urgent ? "destructive" : "outline"}>
                <a href={`tel:${c.tel}`}>
                  <Phone /> Call
                </a>
              </Button>
            </li>
          ))}
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
