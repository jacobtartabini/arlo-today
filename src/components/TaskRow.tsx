import { useEffect, useRef, useState } from "react";
import { formatTaskDate, getPriorityBadge } from "@/lib/format";
import type { Project, Subtask, Task } from "@/types/productivity";

interface TaskRowProps {
  task: Task;
  project?: Project;
  subtasks?: Subtask[];
  onToggle: (id: string, done: boolean) => void;
  onSubtaskToggle?: (id: string, done: boolean) => void;
  onEdit?: (task: Task) => void;
}

const COMPLETE_ANIMATION_MS = 420;

export function TaskRow({
  task,
  project,
  subtasks = [],
  onToggle,
  onSubtaskToggle,
  onEdit,
}: TaskRowProps) {
  const [isCompleting, setIsCompleting] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const completeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const badge = getPriorityBadge(task.priority);
  const displayDate = task.dueDate ?? task.scheduledDate;
  const showAsDone = task.done || isCompleting;
  const hasSubtasks = subtasks.length > 0;
  const completedSubtasks = subtasks.filter((s) => s.done).length;

  useEffect(() => {
    return () => {
      if (completeTimerRef.current) clearTimeout(completeTimerRef.current);
    };
  }, []);

  const handleToggle = () => {
    if (task.done) {
      onToggle(task.id, false);
      return;
    }

    setIsCompleting(true);
    if (completeTimerRef.current) clearTimeout(completeTimerRef.current);
    completeTimerRef.current = setTimeout(() => {
      onToggle(task.id, true);
      setIsCompleting(false);
      completeTimerRef.current = null;
    }, COMPLETE_ANIMATION_MS);
  };

  return (
    <div
      className={`group border-b border-arlo-border/80 last:border-b-0 hover:bg-arlo-surface/80 ${
        showAsDone ? "task-row-completed" : ""
      } ${isCompleting ? "task-row-completing" : ""}`}
    >
      <div className="flex items-start gap-3 px-4 py-3">
        <div className="flex w-[18px] shrink-0 flex-col items-center gap-0.5">
          <button
            type="button"
            onClick={handleToggle}
            aria-label={showAsDone ? "Mark task incomplete" : "Mark task complete"}
            aria-pressed={showAsDone}
            className="relative flex h-[18px] w-[18px] items-center justify-center"
          >
            <span
              className={`task-checkbox h-[18px] w-[18px] rounded-full border-2 transition-colors ${
                showAsDone
                  ? "border-arlo-blue bg-arlo-blue"
                  : "border-gray-300 bg-white"
              } ${isCompleting ? "task-checkbox-pop" : ""}`}
            />
            <svg
              className={`pointer-events-none absolute h-2.5 w-2.5 text-white ${
                showAsDone ? "opacity-100" : "opacity-0"
              } ${isCompleting ? "task-checkmark-draw" : ""}`}
              viewBox="0 0 12 10"
              fill="none"
              aria-hidden
            >
              <path
                className={isCompleting ? "task-checkmark-path-animated" : "task-checkmark-path-static"}
                d="M1 5.5L4.5 9L11 1.5"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          {hasSubtasks && (
            <button
              type="button"
              onClick={() => setExpanded((value) => !value)}
              aria-label={expanded ? "Collapse subtasks" : "Expand subtasks"}
              aria-expanded={expanded}
              className="rounded p-0.5 text-arlo-muted transition hover:bg-arlo-surface hover:text-gray-900"
            >
              {expanded ? <ChevronDownIcon /> : <ChevronRightIcon />}
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={() => onEdit?.(task)}
          className="min-w-0 flex-1 text-left"
        >
          <div className="flex items-start justify-between gap-2">
            <span
              className={`task-title text-[13px] font-medium leading-snug ${
                showAsDone ? "text-arlo-faint task-title-done" : "text-gray-900"
              }`}
            >
              {task.title}
            </span>
            {badge && !showAsDone && (
              <span
                className={`shrink-0 rounded-md border px-1.5 py-0.5 text-[10px] font-semibold leading-none transition-opacity duration-300 ${
                  isCompleting ? "opacity-0" : "opacity-100"
                } ${badge.className}`}
              >
                {badge.label}
              </span>
            )}
          </div>

          {(project || displayDate || task.description || hasSubtasks) && (
            <div
              className={`mt-1 flex flex-wrap items-center gap-2 text-[11px] text-arlo-muted transition-opacity duration-300 ${
                isCompleting ? "opacity-50" : "opacity-100"
              }`}
            >
              {project && (
                <span className="inline-flex items-center gap-1">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: project.color }}
                  />
                  {project.name}
                </span>
              )}
              {displayDate && (
                <span className="inline-flex items-center gap-1 text-red-500">
                  <CalendarIcon />
                  {formatTaskDate(displayDate)}
                </span>
              )}
              {hasSubtasks && (
                <span>
                  {completedSubtasks}/{subtasks.length} subtasks
                </span>
              )}
              {task.description && !displayDate && (
                <span className="line-clamp-1 text-arlo-faint">{task.description}</span>
              )}
            </div>
          )}
        </button>
      </div>

      {expanded && hasSubtasks && (
        <div className="space-y-1.5 border-l-2 border-arlo-border/60 pb-3 pl-[2.35rem] pr-4">
          {subtasks.map((subtask) => (
            <div key={subtask.id} className="flex items-start gap-2.5">
              <button
                type="button"
                onClick={() => onSubtaskToggle?.(subtask.id, !subtask.done)}
                aria-label={subtask.done ? "Mark subtask incomplete" : "Mark subtask complete"}
                aria-pressed={subtask.done}
                className="relative mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center"
              >
                <span
                  className={`h-4 w-4 rounded-full border-2 transition-colors ${
                    subtask.done
                      ? "border-arlo-blue bg-arlo-blue"
                      : "border-gray-300 bg-white"
                  }`}
                />
                {subtask.done && (
                  <svg
                    className="pointer-events-none absolute h-2 w-2 text-white"
                    viewBox="0 0 12 10"
                    fill="none"
                    aria-hidden
                  >
                    <path
                      d="M1 5.5L4.5 9L11 1.5"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </button>
              <span
                className={`text-[12px] leading-snug ${
                  subtask.done ? "text-arlo-faint line-through" : "text-gray-800"
                }`}
              >
                {subtask.title}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ChevronRightIcon() {
  return (
    <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M6 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M4 6l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
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
