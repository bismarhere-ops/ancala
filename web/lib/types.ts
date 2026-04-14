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
  coordinates: { lat: number; lng: number } | null;
  tags: string[];
  hazards: string[];
  checkpoints: Checkpoint[];
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

export interface ImpactResponse {
  data: {
    updatedAt: string;
    metrics: Array<{
      key: string;
      value: number;
      label: string;
      unit: string;
      updatedAt: string;
    }>;
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
