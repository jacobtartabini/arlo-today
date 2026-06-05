import type { Project, Task } from "@/types/productivity";

export type TaskView = "today" | "upcoming" | "completed" | "projects";

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function isAfterToday(date: Date, today: Date): boolean {
  return startOfDay(date).getTime() > startOfDay(today).getTime();
}

export function filterUpcomingTasks(tasks: Task[], today: Date = new Date()): Task[] {
  return tasks
    .filter((task) => {
      if (task.done) return false;
      if (task.scheduledDate && isAfterToday(task.scheduledDate, today)) return true;
      if (task.dueDate && isAfterToday(task.dueDate, today)) return true;
      return false;
    })
    .sort((a, b) => {
      const aDate = a.dueDate ?? a.scheduledDate;
      const bDate = b.dueDate ?? b.scheduledDate;
      if (!aDate && !bDate) return 0;
      if (!aDate) return 1;
      if (!bDate) return -1;
      return aDate.getTime() - bDate.getTime();
    });
}

export function filterCompletedTasks(tasks: Task[]): Task[] {
  return tasks
    .filter((task) => task.done)
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
}

export interface ProjectWithStats extends Project {
  taskCount: number;
  completedTaskCount: number;
  progress: number;
}

export function enrichProjectsWithStats(
  projects: Map<string, Project>,
  tasks: Task[]
): ProjectWithStats[] {
  const stats = new Map<string, { total: number; done: number }>();

  for (const task of tasks) {
    if (!task.projectId) continue;
    const current = stats.get(task.projectId) ?? { total: 0, done: 0 };
    current.total += 1;
    if (task.done) current.done += 1;
    stats.set(task.projectId, current);
  }

  return Array.from(projects.values())
    .map((project) => {
      const { total, done } = stats.get(project.id) ?? { total: 0, done: 0 };
      return {
        ...project,
        taskCount: total,
        completedTaskCount: done,
        progress: total > 0 ? Math.round((done / total) * 100) : 0,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}
