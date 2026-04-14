import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatMinutes(minutes: number) {
  if (!Number.isFinite(minutes)) return "—";
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} h`;
  return `${h} h ${m} min`;
}

export function formatNumber(n: number) {
  return new Intl.NumberFormat("en-US").format(n);
}

export function difficultyColor(level: string) {
  switch (level) {
    case "easy":     return "bg-emerald-100 text-emerald-800 border-emerald-200";
    case "moderate": return "bg-amber-100 text-amber-900 border-amber-200";
    case "hard":     return "bg-orange-100 text-orange-900 border-orange-200";
    case "expert":   return "bg-red-100 text-red-900 border-red-200";
    default:         return "bg-muted text-muted-foreground";
  }
}

export function riskColor(level: string) {
  switch (level) {
    case "low":    return "bg-emerald-500";
    case "medium": return "bg-amber-500";
    case "high":   return "bg-red-500";
    default:       return "bg-muted-foreground";
  }
}
