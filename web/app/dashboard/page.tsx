import type { Metadata } from "next";
import { TripPlanner } from "@/components/trip-planner";
import { Checklists } from "@/components/checklists";
import { EmergencyPanel } from "@/components/emergency-panel";
import { WeatherCard } from "@/components/weather-card";
import { PlanProvider } from "@/components/plan-provider";
import { getWeather, listAllTrails } from "@/lib/api";

export const metadata: Metadata = {
  title: "Hiker Dashboard",
  description: "Plan your hike: checklists, timeline, emergency contacts — saved on your device.",
};

export const revalidate = 60;

export default async function DashboardPage() {
  // The planner needs every trail, not the first page of them.
  const trails = await listAllTrails({ sort: "popular" }).catch(() => []);

  const weather = trails[0]
    ? await getWeather({ slug: trails[0].slug }).catch(() => null)
    : null;

  return (
    <>
      <section className="bg-forest-50">
        <div className="container py-12 md:py-16">
          <div className="mb-2 text-xs font-medium uppercase tracking-wider text-primary">
            Hiker Dashboard
          </div>
          <h1 className="font-display text-4xl font-semibold tracking-tight md:text-5xl">
            Plan. Pack. Move with confidence.
          </h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Checklists, timelines and emergency info — saved on your device and ready for offline hikes.
          </p>
        </div>
      </section>

      <section className="container py-10">
        <PlanProvider trails={trails}>
          <div className="grid gap-6 lg:grid-cols-2">
            <TripPlanner />
            <Checklists />
            <EmergencyPanel />
            {weather && <WeatherCard weather={weather} />}
          </div>
        </PlanProvider>
      </section>
    </>
  );
}
