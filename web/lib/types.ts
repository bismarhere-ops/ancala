export type Difficulty = "easy" | "moderate" | "hard" | "expert";
export type Risk = "low" | "medium" | "high";

export interface Checkpoint {
  position: number;
  name: string;
  km: number;
  elevationM: number | null;
  etaMin: number | null;
  notes: string | null;
}

export type AccessStatus = "open" | "conditional" | "closed";

export interface Coordinates {
  lat: number;
  lng: number;
}

/**
 * Extended data imported from the mountains dataset. Every field is nullable:
 * null means the source recorded "Unknown", which the UI should state
 * explicitly rather than hiding.
 */
export interface MountainProfile {
  accessStatus: AccessStatus;
  dataReliability: string | null;
  sourceLastUpdated: string | null;
  elevationM: number | null;
  nearestCity: string | null;
  basecamp: {
    name: string | null;
    access: string | null;
    coordinates: Coordinates | null;
  };
  summitCoordinates: Coordinates | null;
  route: {
    distanceOneWayKm: string | null;
    distanceRoundTripKm: string | null;
    ascentTimeHours: string | null;
    descentTimeHours: string | null;
    numPos: string | null;
    posBreakdown: string | null;
    elevationGainSegments: string | null;
    trailType: string[];
  };
  assessment: {
    difficultyRaw: string | null;
    riskRaw: string | null;
    keyHazards: string[];
    criticalPoints: string | null;
  };
  logistics: {
    distanceFromSurabayaKm: string | null;
    travelTimeFromSurabayaHours: string | null;
    recommendedTransport: string | null;
    registrationMethod: string | null;
    permitRequired: string | null;
    entryFeeIdr: string | null;
  };
  facilities: {
    waterSources: string | null;
    campingArea: string | null;
    emergencyShelter: string | null;
    signalCoverage: string | null;
    toiletWarung: string | null;
  };
  conservation: {
    environmentalCondition: string | null;
    commonIssues: string[];
    reforestationActivity: string | null;
    csrPotential: string | null;
    recommendedConservation: string[];
  };
  experience: {
    bestTimeMonths: string | null;
    sunriseSunsetRating: number | null;
    uniqueSellingPoint: string | null;
    crowdLevel: string | null;
  };
  safety: {
    minimumGear: string[];
    waterRequirementLiters: string | null;
    emergencyContact: string | null;
    commonAccidentTypes: string[];
  };
  offlineMapAvailable: string | null;
}

export interface Trail {
  id: number;
  slug: string;
  name: string;
  region: string;
  summary: string;
  distanceKm: number;
  elevationGainM: number;
  estimatedMinutes: number;
  difficulty: Difficulty;
  risk: Risk;
  popularity: number;
  coordinates: Coordinates | null;
  tags: string[];
  hazards: string[];
  /** Null for legacy seed trails with no imported profile. */
  accessStatus: AccessStatus | null;
  dataReliability: string | null;
  checkpoints: Checkpoint[];
  profile: MountainProfile | null;
  createdAt: string;
  updatedAt: string;
}

export interface TrailListResponse {
  data: Trail[];
  pagination: { total: number; limit: number; offset: number };
}

export interface WeatherDay {
  date: string;
  condition: string;
  tempMinC: number;
  tempMaxC: number;
  windKph: number;
  precipitationMm: number;
}

export interface WeatherResponse {
  data: {
    source: string;
    updatedAt: string;
    current: {
      tempC: number;
      condition: string;
      windKph: number;
      humidity: number;
    };
    daily: WeatherDay[];
  };
  cached: boolean;
}

/**
 * `measured` values are derived from the database and are facts about the
 * platform. `reported` values have no data source yet — render them as goals,
 * never as achievements.
 */
export type MetricKind = "measured" | "reported";

export interface ImpactMetric {
  key: string;
  value: number;
  target: number | null;
  label: string;
  unit: string;
  kind: MetricKind;
  updatedAt: string;
}

export interface ImpactResponse {
  data: {
    updatedAt: string;
    metrics: ImpactMetric[];
    live: { reports: number; volunteers: number; trails: number };
  };
}

export interface Report {
  id: string;
  trail: { slug: string; name: string } | null;
  type: string;
  description: string | null;
  severity: Risk;
  status: "new" | "ack" | "resolved";
  location: { lat: number; lng: number } | null;
  reporter: { name: string; email: string } | null;
  anonymous: boolean;
  photos: string[];
  createdAt: string;
}

export interface ReportListResponse {
  data: Report[];
}
