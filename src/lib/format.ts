export function formatTaskDate(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const PRIORITY_BADGES: Record<number, { label: string; className: string }> = {
  1: { label: "!!!!", className: "border-red-200 bg-red-50 text-red-600" },
  2: { label: "!!!", className: "border-orange-200 bg-orange-50 text-orange-600" },
  3: { label: "!!", className: "border-blue-200 bg-blue-50 text-blue-600" },
  4: { label: "!", className: "border-gray-200 bg-gray-50 text-gray-500" },
};

export function getPriorityBadge(priority: number): {
  label: string;
  className: string;
} | null {
  return PRIORITY_BADGES[priority] ?? null;
}

export function formatDateLabel(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function toDateInputValue(date?: Date): string {
  if (!date) return "";
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function parseDateInputValue(value: string): Date | undefined {
  if (!value) return undefined;
  const [y, m, d] = value.split("-").map(Number);
  if (!y || !m || !d) return undefined;
  return new Date(y, m - 1, d);
}

export function getGreetingIcon(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "☀️";
  if (hour >= 12 && hour < 17) return "🌤️";
  if (hour >= 17 && hour < 21) return "🌆";
  return "🌙";
}
