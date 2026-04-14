"use client";

import * as React from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { registerVolunteer } from "@/lib/api";

const INTERESTS = [
  { id: "planting", label: "Planting days" },
  { id: "cleanup", label: "Trail clean-up" },
  { id: "bootcamp", label: "Guardian Bootcamp" },
  { id: "mentor", label: "Mentor new hikers" },
];

const REGIONS = ["Pine Ridge", "Hawk Valley", "Silverwood", "Mossy Creek", "Other / will travel"];

const schema = z.object({
  name: z.string().min(2, "Tell us your name"),
  email: z.string().email("Enter a valid email"),
  phone: z.string().optional(),
  region: z.string().optional(),
  interests: z.array(z.string()).default([]),
});
type FormValues = z.infer<typeof schema>;

export function VolunteerForm() {
  const { register, handleSubmit, control, reset, formState } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { interests: [] },
  });
  const [submitting, setSubmitting] = React.useState(false);

  async function onSubmit(values: FormValues) {
    setSubmitting(true);
    try {
      await registerVolunteer({
        name: values.name,
        email: values.email,
        phone: values.phone || undefined,
        region: values.region,
        interests: values.interests as Array<"planting" | "cleanup" | "bootcamp" | "mentor">,
      });
      toast.success("Welcome, Guardian. Our team will reach out within 48 hours.");
      reset();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong.";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="name">Full name</Label>
          <Input id="name" {...register("name")} />
          {formState.errors.name && (
            <p className="text-xs text-destructive">{formState.errors.name.message}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" {...register("email")} />
          {formState.errors.email && (
            <p className="text-xs text-destructive">{formState.errors.email.message}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="phone">Mobile</Label>
          <Input id="phone" type="tel" {...register("phone")} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="region">Region</Label>
          <Controller
            control={control}
            name="region"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="region">
                  <SelectValue placeholder="Choose a region" />
                </SelectTrigger>
                <SelectContent>
                  {REGIONS.map((r) => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
      </div>

      <fieldset>
        <legend className="mb-2 text-sm font-medium">I'm interested in</legend>
        <Controller
          control={control}
          name="interests"
          render={({ field }) => (
            <div className="grid grid-cols-2 gap-2">
              {INTERESTS.map((i) => {
                const checked = field.value.includes(i.id);
                return (
                  <label
                    key={i.id}
                    className="flex cursor-pointer items-center gap-2 rounded-md border bg-background p-3 text-sm hover:bg-secondary/40"
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(v) => {
                        const next = new Set(field.value);
                        v ? next.add(i.id) : next.delete(i.id);
                        field.onChange(Array.from(next));
                      }}
                    />
                    {i.label}
                  </label>
                );
              })}
            </div>
          )}
        />
      </fieldset>

      <Button type="submit" disabled={submitting} className="w-full sm:w-auto">
        {submitting ? "Submitting…" : "Register as Guardian"}
      </Button>
    </form>
  );
}
