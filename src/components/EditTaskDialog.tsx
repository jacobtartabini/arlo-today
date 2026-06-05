import { useCallback, useEffect, useRef, useState } from "react";
import { formatDateLabel, parseDateInputValue, toDateInputValue } from "@/lib/format";
import { CATEGORIES, ENERGY_META, PRIORITY_META, type TaskPicker } from "@/lib/task-form";
import type { EnergyLevel, Project, Task, UpdateTaskOptions } from "@/types/productivity";

interface EditTaskDialogProps {
  task: Task | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projects: Project[];
  onSave: (id: string, options: UpdateTaskOptions) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
}

export function EditTaskDialog({
  task,
  open,
  onOpenChange,
  projects,
  onSave,
  onDelete,
}: EditTaskDialogProps) {
  const titleRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [showDesc, setShowDesc] = useState(false);
  const [priority, setPriority] = useState(3);
  const [energyLevel, setEnergyLevel] = useState<EnergyLevel>("medium");
  const [category, setCategory] = useState("general");
  const [projectId, setProjectId] = useState<string | undefined>();
  const [scheduledDate, setScheduledDate] = useState<Date | undefined>();
  const [dueDate, setDueDate] = useState<Date | undefined>();
  const [loading, setLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [openPicker, setOpenPicker] = useState<TaskPicker>(null);

  useEffect(() => {
    if (!open || !task) {
      setOpenPicker(null);
      setDeleteConfirm(false);
      return;
    }

    setTitle(task.title);
    setDescription(task.description ?? "");
    setShowDesc(!!task.description);
    setPriority(task.priority);
    setEnergyLevel(task.energyLevel);
    setCategory(task.category);
    setProjectId(task.projectId);
    setScheduledDate(task.scheduledDate);
    setDueDate(task.dueDate);
    const t = window.setTimeout(() => titleRef.current?.focus(), 50);
    return () => window.clearTimeout(t);
  }, [open, task]);

  const handleSave = useCallback(async () => {
    if (!task) return;
    const trimmed = title.trim();
    if (!trimmed || loading) return;

    setLoading(true);
    const ok = await onSave(task.id, {
      title: trimmed,
      description: description.trim() || null,
      priority,
      energyLevel,
      category,
      projectId: projectId ?? null,
      scheduledDate: scheduledDate ?? null,
      dueDate: dueDate ?? null,
    });
    setLoading(false);

    if (ok) onOpenChange(false);
  }, [
    task,
    title,
    loading,
    onSave,
    description,
    priority,
    energyLevel,
    category,
    projectId,
    scheduledDate,
    dueDate,
    onOpenChange,
  ]);

  const handleDelete = useCallback(async () => {
    if (!task) return;

    if (!deleteConfirm) {
      setDeleteConfirm(true);
      return;
    }

    setLoading(true);
    const ok = await onDelete(task.id);
    setLoading(false);

    if (ok) onOpenChange(false);
  }, [task, deleteConfirm, loading, onDelete, onOpenChange]);

  if (!open || !task) return null;

  const activeCategory = CATEGORIES.find((c) => c.value === category);
  const activeProject = projects.find((p) => p.id === projectId);

  return (
    <div className="absolute inset-0 z-30 flex flex-col bg-white">
      <header className="flex items-center justify-between border-b border-arlo-border px-4 py-3">
        <h2 className="text-[15px] font-semibold text-gray-900">Edit task</h2>
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
          placeholder="Task title"
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

          {ENERGY_META.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              title={label}
              onClick={() => setEnergyLevel(value)}
              className={`flex h-6 w-6 items-center justify-center rounded-full border transition ${
                energyLevel === value
                  ? "border-arlo-blue bg-blue-50 text-arlo-blue"
                  : "border-arlo-border/80 text-arlo-muted hover:border-arlo-border"
              }`}
            >
              <BatteryIcon level={value} />
            </button>
          ))}

          <span className="mx-0.5 h-4 w-px bg-arlo-border" />

          <PickerButton
            active={openPicker === "scheduled"}
            onClick={() => setOpenPicker((p) => (p === "scheduled" ? null : "scheduled"))}
          >
            <CalendarIcon />
            {scheduledDate ? formatDateLabel(scheduledDate) : "No schedule"}
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
            onChange={(v) => setScheduledDate(parseDateInputValue(v))}
            onClose={() => setOpenPicker(null)}
            allowClear
            onClear={() => setScheduledDate(undefined)}
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
            {description ? "Edit description" : "+ Add description"}
          </button>
        ) : (
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add context or details…"
            rows={3}
            className="mt-3 w-full resize-none rounded-lg border border-arlo-border px-3 py-2 text-sm text-gray-900 outline-none focus:border-arlo-blue"
          />
        )}
      </div>

      <footer className="flex items-center justify-between border-t border-arlo-border px-4 py-3">
        <button
          type="button"
          onClick={() => void handleDelete()}
          disabled={loading}
          className={`text-sm transition ${
            deleteConfirm ? "font-medium text-red-600" : "text-arlo-muted hover:text-red-600"
          }`}
        >
          {deleteConfirm ? "Confirm delete" : "Delete"}
        </button>
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
            onClick={() => void handleSave()}
            disabled={loading || !title.trim()}
            className="rounded-lg bg-arlo-blue px-3 py-1.5 text-sm font-medium text-white transition hover:bg-arlo-blue-hover disabled:opacity-50"
          >
            {loading ? "Saving…" : "Save"}
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
  allowClear,
  onClear,
}: {
  value: string;
  onChange: (value: string) => void;
  onClose: () => void;
  allowClear?: boolean;
  onClear?: () => void;
}) {
  return (
    <div className="mt-2 rounded-lg border border-arlo-border bg-arlo-surface p-3">
      <input
        type="date"
        value={value}
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
