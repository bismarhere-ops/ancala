import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getTrail, getWeather } from "@/lib/api";
import { TelemetryView } from "@/components/telemetry/telemetry-view";

export const revalidate = 60;

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  try {
    const trail = await getTrail(params.slug);
    return { title: `Telemetry · ${trail.name}` };
  } catch {
    return { title: "Telemetry" };
  }
}

export default async function TrailTelemetryPage({ params }: { params: { slug: string } }) {
  let trail;
  try {
    trail = await getTrail(params.slug);
  } catch (err) {
    if (err instanceof Error && err.message.startsWith("API 404")) notFound();
    throw err;
  }
  const weather = await getWeather({ slug: trail.slug }).catch(() => null);

  return (
    <Suspense>
      <TelemetryView trail={trail} weather={weather} />
    </Suspense>
  );
}
