import type { Metadata } from "next";
import { TripPlanner } from "@/components/trip-planner";
import { Checklists } from "@/components/checklists";
import { EmergencyPanel } from "@/components/emergency-panel";
import { PlanWeather } from "@/components/plan-weather";
import { PlanProvider } from "@/components/plan-provider";
import { PhotoHero } from "@/components/photo-hero";
import { listAllTrails } from "@/lib/api";
import { fallback } from "@/lib/server-fallback";

export const metadata: Metadata = {
  title: "Hiker Dashboard",
  description: "Plan your hike: checklists, timeline, emergency contacts — saved on your device.",
};

export const revalidate = 60;

export default async function DashboardPage() {
  // The planner needs every trail, not the first page of them.
  const trails = await listAllTrails({ sort: "popular" }).catch(fallback([], "trails"));

  return (
    <>
      <PhotoHero
        src="/mountains/semeru/img-20180827-063919.jpg"
        credit="Photo: Jejak Ancala · above the clouds on Semeru"
        position="center 55%"
        eyebrow="Hiker Dashboard"
        title="Plan. Pack. Move with confidence."
      >
        Checklists, timelines and emergency info — saved on your device and ready for offline hikes.
      </PhotoHero>

      <section className="container py-10">
        <PlanProvider trails={trails}>
          <div className="grid gap-6 lg:grid-cols-2">
            <TripPlanner />
            <Checklists />
            <EmergencyPanel />
            <PlanWeather />
          </div>
        </PlanProvider>
      </section>
    </>
  );
}
