import { useCallback, useEffect, useRef, useState } from "react";
import { formatDateLabel, parseDateInputValue, toDateInputValue } from "@/lib/format";
import type { CreateTaskOptions, EnergyLevel, Project } from "@/types/productivity";

interface CreateTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projects: Project[];
  initialTitle?: string;
  defaultProjectId?: string;
  onCreate: (title: string, options?: CreateTaskOptions) => Promise<boolean>;
}

const PRIORITY_META: Record<number, { label: string; symbol: string; dot: string; active: string }> = {
  1: { label: "Critical", symbol: "!!!!", dot: "bg-red-500", active: "border-red-400 bg-red-50 text-red-600" },
  2: { label: "High", symbol: "!!!", dot: "bg-orange-500", active: "border-orange-400 bg-orange-50 text-orange-600" },
  3: { label: "Medium", symbol: "!!", dot: "bg-blue-500", active: "border-arlo-blue bg-blue-50 text-arlo-blue" },
  4: { label: "Low", symbol: "!", dot: "bg-gray-400", active: "border-gray-300 bg-gray-50 text-gray-500" },
};

const ENERGY_META: { value: EnergyLevel; label: string }[] = [
  { value: "high", label: "High focus" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low energy" },
];

const CATEGORIES = [
  { value: "general", label: "General" },
  { value: "work", label: "Work" },
  { value: "personal", label: "Personal" },
  { value: "health", label: "Health" },
  { value: "finance", label: "Finance" },
  { value: "learning", label: "Learning" },
  { value: "creative", label: "Creative" },
  { value: "admin", label: "Admin" },
];

export function CreateTaskDialog({
  open,
  onOpenChange,
  projects,
  initialTitle = "",
  defaultProjectId,
  onCreate,
}: CreateTaskDialogProps) {
  const titleRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [showDesc, setShowDesc] = useState(false);
  const [priority, setPriority] = useState(3);
  const [energyLevel, setEnergyLevel] = useState<EnergyLevel>("medium");
  const [category, setCategory] = useState("general");
  const [projectId, setProjectId] = useState<string | undefined>();
  const [scheduledDate, setScheduledDate] = useState<Date>(new Date());
  const [dueDate, setDueDate] = useState<Date | undefined>();
  const [loading, setLoading] = useState(false);
  const [openPicker, setOpenPicker] = useState<"scheduled" | "due" | "category" | "project" | null>(null);

  useEffect(() => {
    if (!open) {
      setOpenPicker(null);
      return;
    }
    setTitle(initialTitle);
    setDescription("");
    setShowDesc(false);
    setPriority(3);
    setEnergyLevel("medium");
    setCategory("general");
    setProjectId(defaultProjectId);
    setScheduledDate(new Date());
    setDueDate(undefined);
    const t = window.setTimeout(() => titleRef.current?.focus(), 50);
    return () => window.clearTimeout(t);
  }, [open, initialTitle, defaultProjectId]);

  const handleSubmit = useCallback(async () => {
    const trimmed = title.trim();
    if (!trimmed || loading) return;

    setLoading(true);
    const ok = await onCreate(trimmed, {
      description: description.trim() || undefined,
      priority,
      energyLevel,
      category,
      projectId,
      scheduledDate,
      dueDate,
    });
    setLoading(false);

    if (ok) onOpenChange(false);
  }, [
    title,
    loading,
    onCreate,
    description,
    priority,
    energyLevel,
    category,
    projectId,
    scheduledDate,
    dueDate,
    onOpenChange,
  ]);

  if (!open) return null;

  const activeCategory = CATEGORIES.find((c) => c.value === category);
  const activeProject = projects.find((p) => p.id === projectId);
  const todayStr = toDateInputValue(new Date());

  return (
    <div className="absolute inset-0 z-20 flex flex-col bg-white">
      <header className="flex items-center justify-between border-b border-arlo-border px-4 py-3">
        <h2 className="text-[15px] font-semibold text-gray-900">New task</h2>
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          className="rounded-md p-1 text-arlo-muted transition hover:bg-arlo-surface hover:text-gray-900"
          aria-label="Close"
        >
          <CloseIcon />
        </button>
      </header>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-3">
        <input
          ref={titleRef}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void handleSubmit();
            }
          }}
          placeholder="What needs to be done?"
          className="w-full border-0 border-b border-arlo-border bg-transparent pb-2 text-base text-gray-900 placeholder:text-arlo-faint outline-none focus:border-arlo-blue"
        />

        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {([1, 2, 3, 4] as const).map((p) => {
            const meta = PRIORITY_META[p];
            const active = priority === p;
            return (
              <button
                key={p}
                type="button"
                title={meta.label}
                onClick={() => setPriority(p)}
                className={`flex h-6 items-center gap-1 rounded-full border px-2 text-[11px] font-semibold transition ${
                  active ? meta.active : "border-arlo-border/80 text-arlo-muted hover:border-arlo-border"
                }`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
                {meta.symbol}
              </button>
            );
          })}

          <span className="mx-0.5 h-4 w-px bg-arlo-border" />

          {ENERGY_META.map(({ value, label }) => {
            const active = energyLevel === value;
            return (
              <button
                key={value}
                type="button"
                title={label}
                onClick={() => setEnergyLevel(value)}
                className={`flex h-6 w-6 items-center justify-center rounded-full border transition ${
                  active
                    ? "border-arlo-blue bg-blue-50 text-arlo-blue"
                    : "border-arlo-border/80 text-arlo-muted hover:border-arlo-border"
                }`}
              >
                <BatteryIcon level={value} />
              </button>
            );
          })}

          <span className="mx-0.5 h-4 w-px bg-arlo-border" />

          <PickerButton
            active={openPicker === "scheduled"}
            onClick={() => setOpenPicker((p) => (p === "scheduled" ? null : "scheduled"))}
          >
            <CalendarIcon />
            {scheduledDate.toDateString() === new Date().toDateString()
              ? "Today"
              : formatDateLabel(scheduledDate)}
          </PickerButton>

          <PickerButton
            active={!!dueDate}
            highlight={!!dueDate}
            onClick={() => setOpenPicker((p) => (p === "due" ? null : "due"))}
          >
            <CalendarIcon />
            {dueDate ? `Due ${formatDateLabel(dueDate)}` : "No due date"}
          </PickerButton>

          <PickerButton
            active={openPicker === "category"}
            onClick={() => setOpenPicker((p) => (p === "category" ? null : "category"))}
          >
            <TagIcon />
            {activeCategory?.label ?? "General"}
          </PickerButton>

          {projects.length > 0 && (
            <PickerButton
              active={openPicker === "project"}
              onClick={() => setOpenPicker((p) => (p === "project" ? null : "project"))}
              style={
                activeProject
                  ? { borderColor: `${activeProject.color}80`, color: activeProject.color }
                  : undefined
              }
            >
              <FolderIcon />
              {activeProject?.name ?? "No project"}
            </PickerButton>
          )}
        </div>

        {openPicker === "scheduled" && (
          <DatePickerPanel
            value={toDateInputValue(scheduledDate)}
            onChange={(v) => {
              const parsed = parseDateInputValue(v);
              if (parsed) setScheduledDate(parsed);
            }}
            onClose={() => setOpenPicker(null)}
            min={todayStr}
          />
        )}

        {openPicker === "due" && (
          <DatePickerPanel
            value={toDateInputValue(dueDate)}
            onChange={(v) => setDueDate(parseDateInputValue(v))}
            onClose={() => setOpenPicker(null)}
            allowClear
            onClear={() => setDueDate(undefined)}
          />
        )}

        {openPicker === "category" && (
          <MenuPanel>
            {CATEGORIES.map((cat) => (
              <MenuItem
                key={cat.value}
                active={category === cat.value}
                onClick={() => {
                  setCategory(cat.value);
                  setOpenPicker(null);
                }}
              >
                {cat.label}
              </MenuItem>
            ))}
          </MenuPanel>
        )}

        {openPicker === "project" && (
          <MenuPanel>
            <MenuItem
              active={!projectId}
              onClick={() => {
                setProjectId(undefined);
                setOpenPicker(null);
              }}
            >
              No project
            </MenuItem>
            {projects.map((project) => (
              <MenuItem
                key={project.id}
                active={projectId === project.id}
                onClick={() => {
                  setProjectId(project.id);
                  setOpenPicker(null);
                }}
              >
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: project.color }} />
                {project.name}
              </MenuItem>
            ))}
          </MenuPanel>
        )}

        {!showDesc ? (
          <button
            type="button"
            onClick={() => setShowDesc(true)}
            className="mt-3 text-left text-xs text-arlo-faint transition hover:text-arlo-muted"
          >
            + Add description
          </button>
        ) : (
          <textarea
            autoFocus
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add context or details…"
            rows={3}
            className="mt-3 w-full resize-none rounded-lg border border-arlo-border px-3 py-2 text-sm text-gray-900 outline-none focus:border-arlo-blue"
          />
        )}
      </div>

      <footer className="flex items-center justify-between border-t border-arlo-border px-4 py-3">
        <span className="text-[11px] text-arlo-faint">Enter to add quickly</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-lg px-3 py-1.5 text-sm text-arlo-muted transition hover:bg-arlo-surface"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={loading || !title.trim()}
            className="rounded-lg bg-arlo-blue px-3 py-1.5 text-sm font-medium text-white transition hover:bg-arlo-blue-hover disabled:opacity-50"
          >
            {loading ? "Adding…" : "Add task"}
          </button>
        </div>
      </footer>
    </div>
  );
}

function PickerButton({
  children,
  active,
  highlight,
  onClick,
  style,
}: {
  children: React.ReactNode;
  active?: boolean;
  highlight?: boolean;
  onClick: () => void;
  style?: React.CSSProperties;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={style}
      className={`flex h-6 items-center gap-1 rounded-full border px-2 text-[11px] transition ${
        highlight
          ? "border-amber-400/60 bg-amber-50 text-amber-600"
          : active
            ? "border-arlo-blue bg-blue-50 text-arlo-blue"
            : "border-arlo-border/80 text-arlo-muted hover:border-arlo-border hover:text-gray-700"
      }`}
    >
      {children}
    </button>
  );
}

function MenuPanel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-2 overflow-hidden rounded-lg border border-arlo-border bg-white shadow-sm">
      {children}
    </div>
  );
}

function MenuItem({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition ${
        active ? "bg-arlo-surface font-medium text-gray-900" : "text-gray-700 hover:bg-arlo-surface/70"
      }`}
    >
      {children}
    </button>
  );
}

function DatePickerPanel({
  value,
  onChange,
  onClose,
  min,
  allowClear,
  onClear,
}: {
  value: string;
  onChange: (value: string) => void;
  onClose: () => void;
  min?: string;
  allowClear?: boolean;
  onClear?: () => void;
}) {
  return (
    <div className="mt-2 rounded-lg border border-arlo-border bg-arlo-surface p-3">
      <input
        type="date"
        value={value}
        min={min}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-arlo-border bg-white px-2 py-1.5 text-sm outline-none focus:border-arlo-blue"
      />
      <div className="mt-2 flex justify-end gap-2">
        {allowClear && (
          <button
            type="button"
            onClick={() => {
              onClear?.();
              onClose();
            }}
            className="text-xs text-arlo-muted hover:text-gray-900"
          >
            Clear
          </button>
        )}
        <button
          type="button"
          onClick={onClose}
          className="text-xs font-medium text-arlo-blue hover:underline"
        >
          Done
        </button>
      </div>
    </div>
  );
}

function BatteryIcon({ level }: { level: EnergyLevel }) {
  const fill =
    level === "high" ? "M3 6h8v4H3z" : level === "medium" ? "M3 6h5v4H3z" : "";
  return (
    <svg className="h-3 w-3" viewBox="0 0 16 16" fill="currentColor">
      <rect x="2" y="5" width="10" height="6" rx="1" fill="none" stroke="currentColor" strokeWidth="1.2" />
      <path d="M13 7v2h1.5v-2H13z" />
      {fill && <path d={fill} />}
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg className="h-3 w-3" fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth="1.5">
      <rect x="2" y="3" width="12" height="11" rx="1.5" />
      <path d="M2 6.5h12M5.5 1.5v3M10.5 1.5v3" strokeLinecap="round" />
    </svg>
  );
}

function TagIcon() {
  return (
    <svg className="h-3 w-3" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M2 8.5 8.5 2h4.5v4.5L6.5 13 2 8.5z" strokeLinejoin="round" />
      <circle cx="11" cy="5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function FolderIcon() {
  return (
    <svg className="h-3 w-3" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M2 4.5A1.5 1.5 0 0 1 3.5 3H6l1.5 2h5A1.5 1.5 0 0 1 14 6.5v6A1.5 1.5 0 0 1 12.5 14h-9A1.5 1.5 0 0 1 2 12.5v-8z" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M4 4l8 8M12 4l-8 8" strokeLinecap="round" />
    </svg>
  );
}
