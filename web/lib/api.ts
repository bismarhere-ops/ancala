import type {
  ImpactResponse,
  ReportListResponse,
  Trail,
  TrailListResponse,
  WeatherResponse,
} from "./types";

// Server-side default — reached from server components.
// Client-side requests hit same-origin and get rewritten by next.config.mjs.
// A host without a scheme (e.g. Render's fromService `host`) defaults to https.
const RAW_SERVER_BASE = process.env.API_BASE_URL || "http://localhost:3000";
const SERVER_BASE = /^https?:\/\//.test(RAW_SERVER_BASE)
  ? RAW_SERVER_BASE
  : `https://${RAW_SERVER_BASE}`;

function baseUrl() {
  // On the server, go direct to the API to skip the rewrite hop.
  if (typeof window === "undefined") return SERVER_BASE;
  return ""; // same-origin → rewritten to API_BASE_URL
}

async function req<T>(
  path: string,
  init?: RequestInit & { revalidate?: number }
): Promise<T> {
  const url = `${baseUrl()}${path}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      accept: "application/json",
      ...(init?.headers || {}),
    },
    // Short ISR-style cache for server fetches; client calls go live.
    next: init?.revalidate != null ? { revalidate: init.revalidate } : undefined,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`API ${res.status} ${res.statusText} — ${url}${text ? `: ${text}` : ""}`);
  }
  return (await res.json()) as T;
}

// --- Trails ----------------------------------------------------------------
export async function listTrails(params: Record<string, string | number | undefined> = {}) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== "") qs.set(k, String(v));
  });
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  return req<TrailListResponse>(`/api/trails${suffix}`, { revalidate: 60 });
}

/** Page size for the public trail list. */
export const TRAIL_PAGE_SIZE = 24;

/** Empty list response, for callers that degrade gracefully when the API is down. */
export const EMPTY_TRAIL_LIST: TrailListResponse = {
  data: [],
  pagination: { total: 0, limit: 0, offset: 0 },
};

/**
 * Every trail, paging until the total is exhausted. Callers that need a
 * complete set (the planner, the report picker) must use this rather than
 * guessing a limit — a hardcoded cap silently omits trails as the dataset grows.
 */
export async function listAllTrails(
  params: Record<string, string | number | undefined> = {}
): Promise<Trail[]> {
  const PER_PAGE = 100; // the API's maximum
  const all: Trail[] = [];

  for (let offset = 0; ; offset += PER_PAGE) {
    const page = await listTrails({ ...params, limit: PER_PAGE, offset });
    all.push(...page.data);
    if (all.length >= page.pagination.total || page.data.length === 0) break;
  }
  return all;
}

export async function getTrail(slug: string) {
  const json = await req<{ data: Trail }>(`/api/trails/${encodeURIComponent(slug)}`, {
    revalidate: 60,
  });
  return json.data;
}

// --- Weather ---------------------------------------------------------------
export async function getWeather(params: { slug?: string; lat?: number; lng?: number }) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined) qs.set(k, String(v));
  });
  return req<WeatherResponse>(`/api/weather?${qs.toString()}`, { revalidate: 600 });
}

// --- Impact ----------------------------------------------------------------
export async function getImpact() {
  return req<ImpactResponse>(`/api/impact`, { revalidate: 300 });
}

// --- Reports ---------------------------------------------------------------
export async function listReports(params: { trailSlug?: string; limit?: number } = {}) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined) qs.set(k, String(v));
  });
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  return req<ReportListResponse>(`/api/reports${suffix}`, { revalidate: 30 });
}

export async function submitReport(form: FormData) {
  const res = await fetch(`/api/reports`, { method: "POST", body: form });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.message || `Request failed (${res.status})`);
  return json;
}

// --- Volunteers ------------------------------------------------------------
export async function registerVolunteer(payload: {
  name: string;
  email: string;
  phone?: string;
  region?: string;
  interests?: string[];
}) {
  const res = await fetch(`/api/volunteers`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.message || `Request failed (${res.status})`);
  return json;
}
