"use client";

import * as React from "react";
import { ClipboardCheck, RotateCcw } from "lucide-react";
import { usePlanOptional } from "@/components/plan-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { ALL_PREP_ITEMS, PREP_SECTIONS, type PrepItem } from "@/lib/prep-checklist";
import type { Trail } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Progress is saved per trail, so two planned hikes don't share ticks. */
const storageKey = (slug: string | undefined) => `fg.prep.v2.${slug ?? "general"}`;

function load(key: string): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
  } catch {
    return {};
  }
}

/**
 * Preparation checklist from the Jejak Ancala trip sheets (lib/prep-checklist.ts).
 * Uses the planned trail from the dashboard, or a trail passed in directly.
 */
export function Checklists({ trail: trailProp }: { trail?: Trail | null } = {}) {
  const plan = usePlanOptional();
  const trail = trailProp ?? plan?.trail ?? null;
  const key = storageKey(trail?.slug);

  const [state, setState] = React.useState<Record<string, boolean>>({});
  const [mandatoryOnly, setMandatoryOnly] = React.useState(false);
  const loaded = React.useRef<string | null>(null);

  React.useEffect(() => {
    setState(load(key));
    loaded.current = key;
  }, [key]);
  React.useEffect(() => {
    if (loaded.current !== key) return; // don't write the previous trail's ticks under a new key
    try {
      localStorage.setItem(key, JSON.stringify(state));
    } catch {
      /* storage blocked */
    }
  }, [state, key]);

  // The dataset's per-mountain water figure beats a generic amount.
  const litres = trail?.profile?.safety.waterRequirementLiters;
  const sections = React.useMemo(
    () =>
      PREP_SECTIONS.map((s) =>
        s.id === "personal" && litres
          ? {
              ...s,
              items: s.items.map((i) =>
                i.id === "bottle" ? { ...i, note: `Plan ${litres} L of water for ${trail?.name ?? "this route"}` } : i
              ),
            }
          : s
      ),
    [litres, trail?.name]
  );

  const mandatory = ALL_PREP_ITEMS.filter((i) => i.urgency === "mandatory");
  const done = ALL_PREP_ITEMS.filter((i) => state[i.id]).length;
  const mandatoryDone = mandatory.filter((i) => state[i.id]).length;
  const pct = Math.round((done / ALL_PREP_ITEMS.length) * 100);

  const toggle = (id: string, value: boolean) => setState((s) => ({ ...s, [id]: value }));

  return (
    <Card>
      <CardHeader className="gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2">
            <ClipboardCheck className="size-5 text-primary" /> Preparation checklist
          </CardTitle>
          <div className="flex items-center gap-2">
            <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Checkbox checked={mandatoryOnly} onCheckedChange={(v) => setMandatoryOnly(Boolean(v))} />
              Mandatory only
            </label>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => confirm("Clear every tick on this checklist?") && setState({})}
              aria-label="Reset checklist"
            >
              <RotateCcw />
            </Button>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          {trail ? `For ${trail.name}. ` : ""}Adapted from the Jejak Ancala trip sheets. Ticks are saved on this device.
        </p>
        <div>
          <Progress value={pct} />
          <div className="mt-1.5 flex flex-wrap justify-between gap-2 text-xs text-muted-foreground">
            <span>
              {pct}% ready · {done} / {ALL_PREP_ITEMS.length}
            </span>
            <span className={cn(mandatoryDone < mandatory.length && "font-medium text-red-700")}>
              Mandatory {mandatoryDone} / {mandatory.length}
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="plan">
          <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1">
            {sections.map((s) => {
              const n = s.items.filter((i) => state[i.id]).length;
              return (
                <TabsTrigger key={s.id} value={s.id} className="text-xs">
                  {s.title}
                  <span className="ml-1 font-mono text-[10px] opacity-60">
                    {n}/{s.items.length}
                  </span>
                </TabsTrigger>
              );
            })}
          </TabsList>
          {sections.map((s) => (
            <TabsContent key={s.id} value={s.id}>
              <p className="pt-2 text-xs text-muted-foreground">{s.subtitle}</p>
              <CheckGroup
                items={mandatoryOnly ? s.items.filter((i) => i.urgency === "mandatory") : s.items}
                state={state}
                onToggle={toggle}
              />
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}

function CheckGroup({
  items,
  state,
  onToggle,
}: {
  items: PrepItem[];
  state: Record<string, boolean>;
  onToggle: (id: string, v: boolean) => void;
}) {
  return (
    <ul className="divide-y pt-1">
      {items.map((item) => (
        <li key={item.id} className="flex items-start gap-3 py-2.5">
          <Checkbox id={`prep-${item.id}`} checked={!!state[item.id]} onCheckedChange={(v) => onToggle(item.id, Boolean(v))} />
          <label htmlFor={`prep-${item.id}`} className="min-w-0 flex-1 cursor-pointer text-sm leading-5">
            <span className={cn(state[item.id] && "text-muted-foreground line-through")}>{item.label}</span>
            {item.qty && <span className="ml-1.5 font-mono text-xs text-muted-foreground">×{item.qty}</span>}
            {item.id_label && item.id_label !== item.label && (
              <span className="block text-xs italic text-muted-foreground">{item.id_label}</span>
            )}
            {item.note && <span className="block text-xs text-primary">{item.note}</span>}
          </label>
          <span
            className={cn(
              "shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
              item.urgency === "mandatory" ? "bg-red-50 text-red-700" : "bg-muted text-muted-foreground"
            )}
          >
            {item.urgency}
          </span>
        </li>
      ))}
    </ul>
  );
}
