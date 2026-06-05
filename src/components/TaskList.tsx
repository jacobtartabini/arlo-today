import type { TaskView } from "@/lib/task-filters";
import type { Project, Subtask, Task } from "@/types/productivity";
import { TaskRow } from "./TaskRow";

interface TaskListProps {
  tasks: Task[];
  projects: Map<string, Project>;
  subtasksByTask?: Map<string, Subtask[]>;
  view: TaskView;
  onToggle: (id: string, done: boolean) => void;
  onSubtaskToggle?: (id: string, done: boolean) => void;
  onEditTask?: (task: Task) => void;
}

const EMPTY_COPY: Record<Exclude<TaskView, "projects">, { title: string; subtitle: string }> = {
  today: {
    title: "No tasks for today",
    subtitle: "Add one below or open Arlo",
  },
  upcoming: {
    title: "No upcoming tasks",
    subtitle: "Schedule tasks for later using the new task form",
  },
  completed: {
    title: "No completed tasks",
    subtitle: "Finished tasks will show up here",
  },
};

export function TaskList({
  tasks,
  projects,
  subtasksByTask = new Map(),
  view,
  onToggle,
  onSubtaskToggle,
  onEditTask,
}: TaskListProps) {
  if (tasks.length === 0) {
    const copy = EMPTY_COPY[view as Exclude<TaskView, "projects">];
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <p className="text-sm font-medium text-gray-700">{copy.title}</p>
        <p className="mt-1 text-xs text-arlo-muted">{copy.subtitle}</p>
      </div>
    );
  }

  const label =
    view === "today" ? "TODAY" : view === "upcoming" ? "UPCOMING" : "COMPLETED";

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center justify-between px-4 pb-1 pt-2">
        <span className="text-[10px] font-semibold tracking-wider text-arlo-faint">{label}</span>
        <span className="text-[11px] text-arlo-muted">{tasks.length} total</span>
      </div>
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
    </div>
  );
}
