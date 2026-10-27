"use client";

import * as React from "react";
import { usePlan } from "@/components/plan-provider";
import { WeatherCard } from "@/components/weather-card";
import type { WeatherResponse } from "@/lib/types";

/** Forecast for the trail being planned (not a fixed "most popular" trail). */
export function PlanWeather() {
  const { trail } = usePlan();
  const slug = trail?.slug;
  const [weather, setWeather] = React.useState<{ slug: string; data: WeatherResponse } | null>(null);

  React.useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    fetch(`/api/weather?slug=${encodeURIComponent(slug)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: WeatherResponse | null) => !cancelled && data && setWeather({ slug, data }))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [slug]);

  // Never show one mountain's forecast under another's plan.
  if (!weather || weather.slug !== slug) return null;
  return <WeatherCard weather={weather.data} place={trail?.name} />;
}
