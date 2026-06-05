import { useMemo } from "react";
import type { ProjectWithStats } from "@/lib/task-filters";
import type { Project, Subtask, Task } from "@/types/productivity";
import { TaskRow } from "./TaskRow";

interface ProjectDetailViewProps {
  project: ProjectWithStats;
  tasks: Task[];
  projects: Map<string, Project>;
  subtasksByTask?: Map<string, Subtask[]>;
  onBack: () => void;
  onAddTask: () => void;
  onToggle: (id: string, done: boolean) => void;
  onSubtaskToggle?: (id: string, done: boolean) => void;
  onEditTask: (task: Task) => void;
}

const STATUS_LABELS: Record<string, string> = {
  active: "Active",
  on_hold: "On hold",
  completed: "Completed",
  archived: "Archived",
};

export function ProjectDetailView({
  project,
  tasks,
  projects,
  subtasksByTask = new Map(),
  onBack,
  onAddTask,
  onToggle,
  onSubtaskToggle,
  onEditTask,
}: ProjectDetailViewProps) {
  const { pendingCount, completedCount } = useMemo(() => {
    const completed = tasks.filter((t) => t.done).length;
    return { pendingCount: tasks.length - completed, completedCount: completed };
  }, [tasks]);

  const stats = [
    { label: "Total", value: tasks.length },
    { label: "Done", value: completedCount },
    { label: "Open", value: pendingCount },
    { label: "Progress", value: `${project.progress}%` },
  ];

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="border-b border-arlo-border px-4 py-3">
        <div className="flex items-start gap-2">
          <button
            type="button"
            onClick={onBack}
            className="mt-0.5 rounded-md p-1 text-arlo-muted transition hover:bg-arlo-surface hover:text-gray-900"
            aria-label="Back to projects"
          >
            <BackIcon />
          </button>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                  style={{ backgroundColor: `${project.color}20`, color: project.color }}
                >
                  <FolderIcon />
                </span>
                <div className="min-w-0">
                  <h2 className="truncate text-[15px] font-semibold text-gray-900">{project.name}</h2>
                  {project.description && (
                    <p className="mt-0.5 line-clamp-2 text-[11px] text-arlo-muted">{project.description}</p>
                  )}
                </div>
              </div>
              <span className="shrink-0 rounded-full border border-arlo-border bg-arlo-surface px-2 py-0.5 text-[10px] font-medium text-arlo-muted">
                {STATUS_LABELS[project.status] ?? project.status}
              </span>
            </div>

            <div className="mt-3 grid grid-cols-4 gap-1.5">
              {stats.map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-lg border border-arlo-border bg-arlo-surface/60 px-2 py-1.5 text-center"
                >
                  <p className="text-[10px] text-arlo-muted">{stat.label}</p>
                  <p className="text-[12px] font-semibold text-gray-900">{stat.value}</p>
                </div>
              ))}
            </div>

            <div className="mt-2 flex items-center gap-2">
              <div className="h-1 flex-1 overflow-hidden rounded-full bg-arlo-surface">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${project.progress}%`, backgroundColor: project.color }}
                />
              </div>
              <span className="text-[10px] font-medium text-arlo-muted">{project.progress}%</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between px-4 pb-1 pt-2">
        <span className="text-[10px] font-semibold tracking-wider text-arlo-faint">TASKS</span>
        <button
          type="button"
          onClick={onAddTask}
          className="rounded-lg bg-arlo-blue px-2.5 py-1 text-[11px] font-medium text-white transition hover:bg-arlo-blue-hover"
        >
          + Add task
        </button>
      </div>

      {tasks.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
          <p className="text-sm font-medium text-gray-700">No tasks in this project</p>
          <p className="mt-1 text-xs text-arlo-muted">Add a task to start tracking progress</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          {tasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              project={task.projectId ? projects.get(task.projectId) : undefined}
              subtasks={subtasksByTask.get(task.id) ?? []}
              onToggle={onToggle}
              onSubtaskToggle={onSubtaskToggle}
              onEdit={onEditTask}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function BackIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M10 3L5 8l5 5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function FolderIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M2 4.5A1.5 1.5 0 0 1 3.5 3H6l1.5 2h5A1.5 1.5 0 0 1 14 6.5v6A1.5 1.5 0 0 1 12.5 14h-9A1.5 1.5 0 0 1 2 12.5v-8z" />
    </svg>
  );
}
