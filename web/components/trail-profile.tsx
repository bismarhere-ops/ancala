import {
  Backpack,
  Droplets,
  Leaf,
  Signal,
  Sparkles,
  Ticket,
  TriangleAlert,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { MountainProfile } from "@/lib/types";
import { isLowReliability } from "@/lib/access";

/**
 * A single label/value row. A null value means the source data recorded
 * "Unknown" — we say so rather than rendering an empty cell, because a hiker
 * needs to know the difference between "no water here" and "we don't know".
 */
function Field({ label, value }: { label: string; value: string | number | null }) {
  const missing = value === null || value === "";
  return (
    <div className="grid grid-cols-3 gap-3 py-2">
      <dt className="text-xs uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className={missing ? "col-span-2 text-sm italic text-muted-foreground/70" : "col-span-2 text-sm"}>
        {missing ? "Unknown" : value}
      </dd>
    </div>
  );
}

function ListField({ label, values }: { label: string; values: string[] }) {
  if (values.length === 0) return <Field label={label} value={null} />;
  return (
    <div className="grid grid-cols-3 gap-3 py-2">
      <dt className="text-xs uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className="col-span-2">
        <ul className="space-y-1 text-sm">
          {values.map((v) => (
            <li key={v} className="flex items-start gap-2">
              <span className="mt-1.5 size-1 shrink-0 rounded-full bg-primary" />
              <span>{v}</span>
            </li>
          ))}
        </ul>
      </dd>
    </div>
  );
}

function Section({
  title,
  icon: Icon,
  children,
  className,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon className="size-4 text-primary" /> {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="divide-y">{children}</dl>
      </CardContent>
    </Card>
  );
}

export function TrailProfile({ profile }: { profile: MountainProfile }) {
  const { assessment, logistics, facilities, safety, conservation, experience } = profile;

  return (
    <div className="space-y-6">
      {assessment.criticalPoints && (
        <Card className="border-red-200 bg-red-50/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-red-900">
              <TriangleAlert className="size-4" /> Critical points
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-red-900/90">{assessment.criticalPoints}</p>
          </CardContent>
        </Card>
      )}

      <Section title="Safety & preparation" icon={Backpack}>
        <ListField label="Minimum gear" values={safety.minimumGear} />
        <Field label="Water needed" value={safety.waterRequirementLiters ? `${safety.waterRequirementLiters} L` : null} />
        <Field label="Emergency contact" value={safety.emergencyContact} />
        <ListField label="Common accidents" values={safety.commonAccidentTypes} />
      </Section>

      <Section title="Facilities" icon={Droplets}>
        <Field label="Water sources" value={facilities.waterSources} />
        <Field label="Camping" value={facilities.campingArea} />
        <Field label="Shelter" value={facilities.emergencyShelter} />
        <Field label="Toilet / warung" value={facilities.toiletWarung} />
      </Section>

      <Section title="Signal coverage" icon={Signal}>
        <Field label="Coverage" value={facilities.signalCoverage} />
        <Field label="Offline map" value={profile.offlineMapAvailable} />
      </Section>

      <Section title="Getting there" icon={Ticket}>
        <Field label="Basecamp" value={profile.basecamp.name} />
        <Field label="Access" value={profile.basecamp.access} />
        <Field
          label="From Surabaya"
          value={
            logistics.distanceFromSurabayaKm
              ? `${logistics.distanceFromSurabayaKm} km · ${logistics.travelTimeFromSurabayaHours ?? "?"} h`
              : null
          }
        />
        <Field label="Transport" value={logistics.recommendedTransport} />
        <Field label="Registration" value={logistics.registrationMethod} />
        <Field label="Permit" value={logistics.permitRequired} />
        <Field label="Entry fee" value={logistics.entryFeeIdr} />
      </Section>

      <Section title="When to go" icon={Sparkles}>
        <Field label="Best months" value={experience.bestTimeMonths} />
        <Field
          label="Sunrise view"
          value={experience.sunriseSunsetRating ? `${experience.sunriseSunsetRating}/5` : null}
        />
        <Field label="Crowds" value={experience.crowdLevel} />
      </Section>

      <Section title="Conservation" icon={Leaf} className="border-forest-200 bg-forest-50/50">
        <Field label="Condition" value={conservation.environmentalCondition} />
        <ListField label="Known issues" values={conservation.commonIssues} />
        <Field label="Reforestation" value={conservation.reforestationActivity} />
        <Field label="CSR potential" value={conservation.csrPotential} />
        <ListField label="Recommended actions" values={conservation.recommendedConservation} />
      </Section>

      <p className="text-xs text-muted-foreground">
        Data reliability:{" "}
        <Badge variant="outline" className="align-middle">
          {profile.dataReliability ?? "Unknown"}
        </Badge>{" "}
        {profile.sourceLastUpdated && <>· Source last updated {profile.sourceLastUpdated}</>}
        {isLowReliability(profile.dataReliabilityTier) && (
          <> · Verify these figures locally before relying on them.</>
        )}
      </p>
    </div>
  );
}
