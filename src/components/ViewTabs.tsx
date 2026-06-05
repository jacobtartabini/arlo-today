import type { TaskView } from "@/lib/task-filters";

interface ViewTabsProps {
  active: TaskView;
  onChange: (view: TaskView) => void;
  counts: Record<TaskView, number>;
}

const TABS: { id: TaskView; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "upcoming", label: "Upcoming" },
  { id: "completed", label: "Done" },
  { id: "projects", label: "Projects" },
];

export function ViewTabs({ active, onChange, counts }: ViewTabsProps) {
  return (
    <div className="mt-3 flex items-center gap-1 overflow-x-auto rounded-full border border-arlo-border bg-arlo-surface p-0.5">
      {TABS.map((tab) => {
        const selected = active === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium transition ${
              selected
                ? "bg-white text-gray-900 shadow-sm"
                : "text-arlo-muted hover:text-gray-700"
            }`}
          >
            {tab.label}
            {counts[tab.id] > 0 && (
              <span className={`text-[10px] ${selected ? "text-arlo-muted" : "text-arlo-faint"}`}>
                {counts[tab.id]}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
