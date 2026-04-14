import { Cloud, CloudRain, Droplets, Snowflake, Sun, Wind, Zap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { WeatherResponse } from "@/lib/types";
import { cn } from "@/lib/utils";

function iconFor(condition: string) {
  const c = condition.toLowerCase();
  if (c.includes("thunder")) return Zap;
  if (c.includes("snow")) return Snowflake;
  if (c.includes("rain") || c.includes("shower")) return CloudRain;
  if (c.includes("cloud")) return Cloud;
  return Sun;
}

export function WeatherCard({
  weather,
  compact = false,
}: {
  weather: WeatherResponse;
  compact?: boolean;
}) {
  const { current, daily, source } = weather.data;
  const CurrentIcon = iconFor(current.condition);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>Weather</CardTitle>
        <span className="text-xs text-muted-foreground capitalize">{source}</span>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4">
          <CurrentIcon className="size-10 text-primary" />
          <div>
            <div className="font-display text-3xl font-semibold">{current.tempC}°C</div>
            <div className="text-sm text-muted-foreground">{current.condition}</div>
          </div>
          <div className="ml-auto grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1"><Wind className="size-3.5" /> {current.windKph} km/h</span>
            <span className="inline-flex items-center gap-1"><Droplets className="size-3.5" /> {current.humidity}%</span>
          </div>
        </div>

        {!compact && (
          <div className="mt-5 grid grid-cols-5 gap-2">
            {daily.slice(0, 5).map((d) => {
              const I = iconFor(d.condition);
              return (
                <div
                  key={d.date}
                  className={cn(
                    "rounded-lg border p-2 text-center",
                    d.precipitationMm > 3 && "border-blue-200 bg-blue-50/60"
                  )}
                >
                  <div className="text-[10px] font-medium uppercase text-muted-foreground">
                    {new Date(d.date).toLocaleDateString(undefined, { weekday: "short" })}
                  </div>
                  <I className="mx-auto my-1 size-4" />
                  <div className="text-xs font-semibold">
                    {d.tempMaxC}° <span className="font-normal text-muted-foreground">/ {d.tempMinC}°</span>
                  </div>
                  <div className="text-[10px] text-muted-foreground">{d.precipitationMm}mm</div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
