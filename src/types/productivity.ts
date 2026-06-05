export type EnergyLevel = "low" | "medium" | "high";
export type ProjectStatus = "active" | "on_hold" | "completed" | "archived";

export interface CreateTaskOptions {
  projectId?: string;
  description?: string;
  priority?: number;
  energyLevel?: EnergyLevel;
  category?: string;
  dueDate?: Date;
  scheduledDate?: Date;
  timeEstimateMinutes?: number;
}

export interface UpdateTaskOptions {
  title?: string;
  projectId?: string | null;
  description?: string | null;
  priority?: number;
  energyLevel?: EnergyLevel;
  category?: string;
  dueDate?: Date | null;
  scheduledDate?: Date | null;
  timeEstimateMinutes?: number | null;
  done?: boolean;
}

export interface Project {
  id: string;
  name: string;
  color: string;
  description?: string;
  status: ProjectStatus;
  icon?: string;
}

export interface Subtask {
  id: string;
  taskId: string;
  title: string;
  done: boolean;
  orderIndex: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Task {
  id: string;
  projectId?: string;
  title: string;
  description?: string;
  done: boolean;
  priority: number;
  dueDate?: Date;
  scheduledDate?: Date;
  timeEstimateMinutes?: number;
  energyLevel: EnergyLevel;
  category: string;
  orderIndex: number;
  createdAt: Date;
  updatedAt: Date;
  subtasks?: Subtask[];
  project?: Project;
}

export interface DbTask {
  id: string;
  user_id: string | null;
  user_key: string | null;
  project_id: string | null;
  title: string;
  description: string | null;
  done: boolean;
  priority: number;
  due_date: string | null;
  scheduled_date: string | null;
  time_estimate_minutes: number | null;
  energy_level: string | null;
  category: string | null;
  order_index: number | null;
  created_at: string;
  updated_at: string;
}

export interface DbSubtask {
  id: string;
  task_id: string;
  user_id: string | null;
  user_key: string | null;
  title: string;
  done: boolean;
  order_index: number;
  created_at: string;
  updated_at: string;
}

export interface DbProject {
  id: string;
  name: string;
  color: string;
  description?: string | null;
  status?: string | null;
  icon?: string | null;
}

export const dbToTask = (db: DbTask): Task => ({
  id: db.id,
  projectId: db.project_id ?? undefined,
  title: db.title,
  description: db.description ?? undefined,
  done: db.done,
  priority: db.priority,
  dueDate: db.due_date ? new Date(db.due_date) : undefined,
  scheduledDate: db.scheduled_date ? new Date(db.scheduled_date) : undefined,
  timeEstimateMinutes: db.time_estimate_minutes ?? undefined,
  energyLevel: (db.energy_level as EnergyLevel) ?? "medium",
  category: db.category ?? "general",
  orderIndex: db.order_index ?? 0,
  createdAt: new Date(db.created_at),
  updatedAt: new Date(db.updated_at),
});

export const dbToSubtask = (db: DbSubtask): Subtask => ({
  id: db.id,
  taskId: db.task_id,
  title: db.title,
  done: db.done,
  orderIndex: db.order_index,
  createdAt: new Date(db.created_at),
  updatedAt: new Date(db.updated_at),
});

export const dbToProject = (db: DbProject): Project => ({
  id: db.id,
  name: db.name,
  color: db.color,
  description: db.description ?? undefined,
  status: (db.status as ProjectStatus) ?? "active",
  icon: db.icon ?? undefined,
});
