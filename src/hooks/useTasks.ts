import { useCallback, useEffect, useState } from "react";
import { AUTH_CHANGED_EVENT, isAuthenticated } from "@/lib/auth";
import { dataApiHelpers } from "@/lib/data-api";
import { filterTodayTasks } from "@/lib/today-tasks";
import type {
  CreateTaskOptions,
  DbProject,
  DbSubtask,
  DbTask,
  Project,
  Subtask,
  Task,
  UpdateTaskOptions,
} from "@/types/productivity";
import { dbToProject, dbToSubtask, dbToTask } from "@/types/productivity";

async function fetchSubtasksForTasks(taskIds: string[]): Promise<Map<string, Subtask[]>> {
  if (taskIds.length === 0) return new Map();

  const { data, error } = await dataApiHelpers.selectWithIn<DbSubtask[]>(
    "subtasks",
    "task_id",
    taskIds,
    { column: "order_index", ascending: true }
  );

  if (error || !data) return new Map();

  const subtasksByTask = new Map<string, Subtask[]>();
  for (const db of data) {
    const subtask = dbToSubtask(db);
    const existing = subtasksByTask.get(subtask.taskId) ?? [];
    existing.push(subtask);
    subtasksByTask.set(subtask.taskId, existing);
  }

  return subtasksByTask;
}

interface UseTasksResult {
  allTasks: Task[];
  tasks: Task[];
  subtasksByTask: Map<string, Subtask[]>;
  projects: Map<string, Project>;
  projectsList: Project[];
  loading: boolean;
  error: string | null;
  authenticated: boolean;
  refresh: () => Promise<void>;
  toggleTask: (id: string, done: boolean) => Promise<boolean>;
  toggleSubtask: (id: string, done: boolean) => Promise<boolean>;
  createTask: (title: string, options?: CreateTaskOptions) => Promise<Task | null>;
  updateTask: (id: string, options: UpdateTaskOptions) => Promise<boolean>;
  deleteTask: (id: string) => Promise<boolean>;
}

export function useTasks(): UseTasksResult {
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [subtasksByTask, setSubtasksByTask] = useState<Map<string, Subtask[]>>(new Map());
  const [projects, setProjects] = useState<Map<string, Project>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authenticated, setAuthenticated] = useState(false);

  const tasks = filterTodayTasks(allTasks);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    // Derive auth state from the local token first so the UI transitions
    // immediately rather than staying on SignedOut after a successful paste.
    const hasToken = await isAuthenticated();
    setAuthenticated(hasToken);

    if (!hasToken) {
      setAllTasks([]);
      setSubtasksByTask(new Map());
      setProjects(new Map());
      setLoading(false);
      return;
    }

    const [tasksResult, projectsResult] = await Promise.all([
      dataApiHelpers.select<DbTask[]>("tasks", {
        order: { column: "priority", ascending: false },
      }),
      dataApiHelpers.select<DbProject[]>("projects"),
    ]);

    const authError =
      tasksResult.error?.toLowerCase().includes("authentication") ||
      tasksResult.error?.toLowerCase().includes("unauthenticated") ||
      tasksResult.error?.toLowerCase().includes("unauthorized");

    if (authError) {
      const stillHasToken = await isAuthenticated();
      if (!stillHasToken) {
        setAuthenticated(false);
        setAllTasks([]);
        setSubtasksByTask(new Map());
        setProjects(new Map());
        setError(null);
        setLoading(false);
        return;
      }

      // Keep the saved session; surface the API issue without forcing re-login.
      setAuthenticated(true);
      setError(tasksResult.error);
      setLoading(false);
      return;
    }

    if (tasksResult.error) {
      // Non-auth API error — token is valid but data failed; show the error UI
      // (not SignedOut) so the user gets actionable feedback.
      setError(tasksResult.error);
      setLoading(false);
      return;
    }
    const tasks = (tasksResult.data ?? []).map(dbToTask);
    setAllTasks(tasks);

    if (tasks.length > 0) {
      const subtasks = await fetchSubtasksForTasks(tasks.map((t) => t.id));
      setSubtasksByTask(subtasks);
    } else {
      setSubtasksByTask(new Map());
    }

    const projectMap = new Map<string, Project>();
    for (const db of projectsResult.data ?? []) {
      projectMap.set(db.id, dbToProject(db));
    }
    setProjects(projectMap);
    setLoading(false);
  }, []);

  const toggleTask = useCallback(
    async (id: string, done: boolean): Promise<boolean> => {
      const previous = allTasks;
      setAllTasks((current) => current.map((t) => (t.id === id ? { ...t, done } : t)));

      const { error: updateError } = await dataApiHelpers.update("tasks", id, { done });
      if (updateError) {
        setAllTasks(previous);
        setError(updateError);
        return false;
      }
      return true;
    },
    [allTasks]
  );

  const updateTask = useCallback(
    async (id: string, options: UpdateTaskOptions): Promise<boolean> => {
      const previous = allTasks;
      setAllTasks((current) =>
        current.map((task) => {
          if (task.id !== id) return task;
          return {
            ...task,
            title: options.title ?? task.title,
            description:
              options.description !== undefined ? options.description ?? undefined : task.description,
            priority: options.priority ?? task.priority,
            energyLevel: options.energyLevel ?? task.energyLevel,
            category: options.category ?? task.category,
            done: options.done ?? task.done,
            projectId:
              options.projectId !== undefined ? options.projectId ?? undefined : task.projectId,
            dueDate: options.dueDate !== undefined ? options.dueDate ?? undefined : task.dueDate,
            scheduledDate:
              options.scheduledDate !== undefined
                ? options.scheduledDate ?? undefined
                : task.scheduledDate,
            timeEstimateMinutes:
              options.timeEstimateMinutes !== undefined
                ? options.timeEstimateMinutes ?? undefined
                : task.timeEstimateMinutes,
          };
        })
      );

      const dbData: Record<string, unknown> = {};
      if (options.title !== undefined) dbData.title = options.title;
      if (options.description !== undefined) dbData.description = options.description;
      if (options.priority !== undefined) dbData.priority = options.priority;
      if (options.energyLevel !== undefined) dbData.energy_level = options.energyLevel;
      if (options.category !== undefined) dbData.category = options.category;
      if (options.done !== undefined) dbData.done = options.done;
      if (options.projectId !== undefined) dbData.project_id = options.projectId;
      if (options.dueDate !== undefined) {
        dbData.due_date = options.dueDate ? options.dueDate.toISOString().split("T")[0] : null;
      }
      if (options.scheduledDate !== undefined) {
        dbData.scheduled_date = options.scheduledDate
          ? options.scheduledDate.toISOString().split("T")[0]
          : null;
      }
      if (options.timeEstimateMinutes !== undefined) {
        dbData.time_estimate_minutes = options.timeEstimateMinutes;
      }

      const { error: updateError } = await dataApiHelpers.update("tasks", id, dbData);
      if (updateError) {
        setAllTasks(previous);
        setError(updateError);
        return false;
      }
      return true;
    },
    [allTasks]
  );

  const toggleSubtask = useCallback(
    async (id: string, done: boolean): Promise<boolean> => {
      const previous = subtasksByTask;
      setSubtasksByTask((current) => {
        const next = new Map(current);
        for (const [taskId, subtasks] of next) {
          const index = subtasks.findIndex((s) => s.id === id);
          if (index !== -1) {
            const updated = [...subtasks];
            updated[index] = { ...updated[index], done };
            next.set(taskId, updated);
            break;
          }
        }
        return next;
      });

      const { error: updateError } = await dataApiHelpers.update("subtasks", id, { done });
      if (updateError) {
        setSubtasksByTask(previous);
        setError(updateError);
        return false;
      }
      return true;
    },
    [subtasksByTask]
  );

  const deleteTask = useCallback(
    async (id: string): Promise<boolean> => {
      const previous = allTasks;
      setAllTasks((current) => current.filter((t) => t.id !== id));

      const { error: deleteError } = await dataApiHelpers.delete("tasks", id);
      if (deleteError) {
        setAllTasks(previous);
        setError(deleteError);
        return false;
      }
      return true;
    },
    [allTasks]
  );

  const createTask = useCallback(
    async (title: string, options: CreateTaskOptions = {}): Promise<Task | null> => {
      const today = new Date();
      const scheduledDate = options.scheduledDate ?? today;

      const { data, error: insertError } = await dataApiHelpers.insert<DbTask>("tasks", {
        title,
        description: options.description?.trim() || null,
        category: options.category ?? "general",
        due_date: options.dueDate ? options.dueDate.toISOString().split("T")[0] : null,
        project_id: options.projectId ?? null,
        time_estimate_minutes: options.timeEstimateMinutes ?? null,
        energy_level: options.energyLevel ?? "medium",
        scheduled_date: scheduledDate.toISOString().split("T")[0],
        priority: options.priority ?? 3,
      });

      if (insertError || !data) {
        setError(insertError ?? "Failed to create task");
        return null;
      }

      const task = dbToTask(data);
      setAllTasks((current) => [task, ...current]);
      return task;
    },
    []
  );

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const onAuthChanged = () => void refresh();
    window.addEventListener(AUTH_CHANGED_EVENT, onAuthChanged);
    return () => window.removeEventListener(AUTH_CHANGED_EVENT, onAuthChanged);
  }, [refresh]);

  const projectsList = Array.from(projects.values()).sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  return {
    allTasks,
    tasks,
    subtasksByTask,
    projects,
    projectsList,
    loading,
    error,
    authenticated,
    refresh,
    toggleTask,
    toggleSubtask,
    createTask,
    updateTask,
    deleteTask,
  };
}
