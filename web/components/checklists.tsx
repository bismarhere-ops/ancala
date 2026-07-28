"use client";

import * as React from "react";
import { usePlan } from "@/components/plan-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";

type Item = { id: string; label: string };

const TRIP: Item[] = [
  { id: "plan-shared", label: "Shared plan with a trusted contact" },
  { id: "weather", label: "Checked today's and tomorrow's forecast" },
  { id: "permit", label: "Permits / registrations in order" },
  { id: "map-offline", label: "Downloaded offline trail guide" },
  { id: "daylight", label: "Estimated arrival before sunset" },
  { id: "transport", label: "Return transport confirmed" },
];

const GEAR: Item[] = [
  { id: "water", label: "Water — 2L minimum per person" },
  { id: "food", label: "Food + emergency snack" },
  { id: "layers", label: "Waterproof + warm layer" },
  { id: "firstaid", label: "First-aid kit" },
  { id: "light", label: "Headlamp + spare battery" },
  { id: "compass", label: "Map + compass / offline GPS" },
  { id: "whistle", label: "Whistle + emergency blanket" },
  { id: "sun", label: "Sunscreen + hat" },
];

const STORAGE_KEY = "fg.checklists.v1";

function loadState(): Record<string, boolean> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
  } catch {
    return {};
  }
}

export function Checklists() {
  const { trail } = usePlan();

  // The dataset carries a per-mountain water figure; using the generic 2L here
  // would contradict the trail page for the same hike.
  const litres = trail?.profile?.safety.waterRequirementLiters;
  const gear = React.useMemo(
    () =>
      GEAR.map((g) =>
        g.id === "water" && litres
          ? { ...g, label: `Water — ${litres} L for ${trail?.name ?? "this route"}` }
          : g
      ),
    [litres, trail?.name]
  );

  const [state, setState] = React.useState<Record<string, boolean>>({});

  React.useEffect(() => setState(loadState()), []);
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const total = TRIP.length + GEAR.length;
  const done = [...TRIP, ...GEAR].filter((i) => state[i.id]).length;
  const pct = Math.round((done / total) * 100);

  function toggle(id: string, value: boolean) {
    setState((s) => ({ ...s, [id]: value }));
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Checklists</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="trip">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="trip">Trip</TabsTrigger>
            <TabsTrigger value="gear">Gear</TabsTrigger>
          </TabsList>
          <TabsContent value="trip">
            <CheckGroup items={TRIP} state={state} onToggle={toggle} />
          </TabsContent>
          <TabsContent value="gear">
            <CheckGroup items={gear} state={state} onToggle={toggle} />
          </TabsContent>
        </Tabs>
        <div className="mt-5">
          <Progress value={pct} />
          <p className="mt-2 text-xs text-muted-foreground">{pct}% ready · {done} / {total}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function CheckGroup({
  items,
  state,
  onToggle,
}: {
  items: Item[];
  state: Record<string, boolean>;
  onToggle: (id: string, v: boolean) => void;
}) {
  return (
    <ul className="space-y-3 pt-2">
      {items.map((item) => (
        <li key={item.id} className="flex items-start gap-3">
          <Checkbox
            id={item.id}
            checked={!!state[item.id]}
            onCheckedChange={(v) => onToggle(item.id, Boolean(v))}
          />
          <label
            htmlFor={item.id}
            className={`cursor-pointer text-sm leading-5 ${state[item.id] ? "text-muted-foreground line-through" : ""}`}
          >
            {item.label}
          </label>
        </li>
      ))}
    </ul>
  );
}
