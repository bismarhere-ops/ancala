/** Island groups for the archipelago map and filters, from the trail's province. */
export type IslandId = "all" | "sumatra" | "java" | "bali-nt" | "sulawesi";

export const ISLANDS: { id: IslandId; label: string; bbox: [number, number, number, number] }[] = [
  // bbox: [west lon, north lat, east lon, south lat]
  { id: "all", label: "Archipelago", bbox: [94, 6.5, 127, -11] },
  { id: "sumatra", label: "Sumatra", bbox: [95, 5, 106.5, -6] },
  { id: "java", label: "Java", bbox: [105.5, -5.6, 114.8, -9] },
  { id: "bali-nt", label: "Bali & Nusa Tenggara", bbox: [114.2, -7.6, 123, -9.6] },
  { id: "sulawesi", label: "Sulawesi", bbox: [118.2, -1.5, 122.2, -6] },
];

export function islandOf(region: string): Exclude<IslandId, "all"> | null {
  const r = region.toLowerCase();
  if (r.includes("sumatra") || r.includes("jambi")) return "sumatra";
  if (r.includes("java") || r.includes("yogyakarta")) return "java";
  if (r.includes("bali") || r.includes("nusa tenggara")) return "bali-nt";
  if (r.includes("sulawesi")) return "sulawesi";
  return null;
}

/** Short province label for pills ("West Nusa Tenggara (NTB)" -> "NTB"). */
export function provinceLabel(region: string) {
  const m = region.match(/\(([^)]+)\)/);
  if (m) return m[1];
  if (/border/i.test(region)) return region.split("/")[0].trim();
  if (/yogyakarta/i.test(region)) return "Central Java";
  if (/jambi/i.test(region)) return "West Sumatra";
  return region;
}
