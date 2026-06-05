import type { EnergyLevel } from "@/types/productivity";

export const PRIORITY_META: Record<
  number,
  { label: string; symbol: string; dot: string; active: string }
> = {
  1: { label: "Critical", symbol: "!!!!", dot: "bg-red-500", active: "border-red-400 bg-red-50 text-red-600" },
  2: { label: "High", symbol: "!!!", dot: "bg-orange-500", active: "border-orange-400 bg-orange-50 text-orange-600" },
  3: { label: "Medium", symbol: "!!", dot: "bg-blue-500", active: "border-arlo-blue bg-blue-50 text-arlo-blue" },
  4: { label: "Low", symbol: "!", dot: "bg-gray-400", active: "border-gray-300 bg-gray-50 text-gray-500" },
};

export const ENERGY_META: { value: EnergyLevel; label: string }[] = [
  { value: "high", label: "High focus" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low energy" },
];

export const CATEGORIES = [
  { value: "general", label: "General" },
  { value: "work", label: "Work" },
  { value: "personal", label: "Personal" },
  { value: "health", label: "Health" },
  { value: "finance", label: "Finance" },
  { value: "learning", label: "Learning" },
  { value: "creative", label: "Creative" },
  { value: "admin", label: "Admin" },
];

export type TaskPicker = "scheduled" | "due" | "category" | "project" | null;
