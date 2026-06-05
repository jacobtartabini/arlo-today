import type { Task } from "@/types/productivity";

/**
 * Matches Arlo TodayView filter logic.
 */
export function filterTodayTasks(tasks: Task[], today: Date = new Date()): Task[] {
  const todayStr = today.toDateString();

  const todayTasks = tasks.filter((task) => {
    if (task.done) return false;
    if (task.scheduledDate?.toDateString() === todayStr) return true;
    if (task.dueDate?.toDateString() === todayStr) return true;
    if (task.priority >= 2) return true;
    return false;
  });

  return todayTasks.length > 0 ? todayTasks : tasks.filter((t) => !t.done);
}

export function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "Good morning";
  if (hour >= 12 && hour < 17) return "Good afternoon";
  if (hour >= 17 && hour < 21) return "Good evening";
  return "Good night";
}

export function getTodayProgress(tasks: Task[]): { done: number; total: number; percent: number } {
  const incomplete = tasks.filter((t) => !t.done).length;
  const total = tasks.length;
  const done = total - incomplete;
  const percent = total > 0 ? Math.round((done / total) * 100) : 0;
  return { done, total, percent };
}
