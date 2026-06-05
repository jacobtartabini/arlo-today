import { useCallback, useEffect, useMemo, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { openUrl } from "@tauri-apps/plugin-opener";
import { CreateTaskDialog } from "@/components/CreateTaskDialog";
import { EditTaskDialog } from "@/components/EditTaskDialog";
import { ProjectDetailView } from "@/components/ProjectDetailView";
import { ProjectListView } from "@/components/ProjectListView";
import { QuickAdd } from "@/components/QuickAdd";
import { SignedOut } from "@/components/SignedOut";
import { TaskList } from "@/components/TaskList";
import { ViewTabs } from "@/components/ViewTabs";
import { useTasks } from "@/hooks/useTasks";
import { getArloWebUrl, initAuthDeepLinks, isTokenExpiredMessage, signOut } from "@/lib/auth";
import { getGreetingIcon } from "@/lib/format";
import {
  enrichProjectsWithStats,
  filterCompletedTasks,
  filterUpcomingTasks,
  type ProjectWithStats,
  type TaskView,
} from "@/lib/task-filters";
import { filterTodayTasks, getGreeting, getTodayProgress } from "@/lib/today-tasks";
import type { CreateTaskOptions, Task, UpdateTaskOptions } from "@/types/productivity";

function App() {
  const {
    allTasks,
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
  } = useTasks();

  const [view, setView] = useState<TaskView>("today");
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [draftTitle, setDraftTitle] = useState("");
  const [createProjectId, setCreateProjectId] = useState<string | undefined>();
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  useEffect(() => {
    void initAuthDeepLinks();
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (editOpen) {
          setEditOpen(false);
          setEditingTask(null);
          return;
        }
        if (createOpen) {
          setCreateOpen(false);
          return;
        }
        if (selectedProjectId) {
          setSelectedProjectId(null);
          return;
        }
        void getCurrentWindow().hide();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [editOpen, createOpen, selectedProjectId]);

  const todayTasks = useMemo(() => filterTodayTasks(allTasks), [allTasks]);
  const upcomingTasks = useMemo(() => filterUpcomingTasks(allTasks), [allTasks]);
  const completedTasks = useMemo(() => filterCompletedTasks(allTasks), [allTasks]);
  const projectsWithStats = useMemo(
    () => enrichProjectsWithStats(projects, allTasks),
    [projects, allTasks]
  );

  const selectedProject = useMemo(
    () => projectsWithStats.find((p) => p.id === selectedProjectId) ?? null,
    [projectsWithStats, selectedProjectId]
  );

  const selectedProjectTasks = useMemo(() => {
    if (!selectedProjectId) return [];
    return allTasks
      .filter((task) => task.projectId === selectedProjectId)
      .sort((a, b) => {
        if (a.done !== b.done) return a.done ? 1 : -1;
        return b.priority - a.priority || a.title.localeCompare(b.title);
      });
  }, [allTasks, selectedProjectId]);

  const viewTasks = useMemo(() => {
    switch (view) {
      case "today":
        return todayTasks;
      case "upcoming":
        return upcomingTasks;
      case "completed":
        return completedTasks;
      default:
        return [];
    }
  }, [view, todayTasks, upcomingTasks, completedTasks]);

  const viewCounts = useMemo(
    () => ({
      today: todayTasks.length,
      upcoming: upcomingTasks.length,
      completed: completedTasks.length,
      projects: projectsWithStats.length,
    }),
    [todayTasks, upcomingTasks, completedTasks, projectsWithStats]
  );

  const handleCreate = useCallback(
    async (title: string, options?: CreateTaskOptions) => {
      const task = await createTask(title, options);
      return task !== null;
    },
    [createTask]
  );

  const handleQuickCreate = useCallback(
    async (title: string) => handleCreate(title),
    [handleCreate]
  );

  const openCreateDialog = useCallback((title = "", projectId?: string) => {
    setDraftTitle(title);
    setCreateProjectId(projectId);
    setCreateOpen(true);
  }, []);

  const openEditDialog = useCallback((task: Task) => {
    setEditingTask(task);
    setEditOpen(true);
  }, []);

  const handleSaveTask = useCallback(
    async (id: string, options: UpdateTaskOptions) => updateTask(id, options),
    [updateTask]
  );

  const handleDeleteTask = useCallback(
    async (id: string) => {
      const ok = await deleteTask(id);
      if (ok) setEditingTask(null);
      return ok;
    },
    [deleteTask]
  );

  const handleProjectClick = useCallback((project: ProjectWithStats) => {
    setSelectedProjectId(project.id);
  }, []);

  const incompleteCount = allTasks.filter((t) => !t.done).length;
  const progress = getTodayProgress(todayTasks);
  const sessionExpired = !authenticated && isTokenExpiredMessage(error);
  const activeProjects = projectsWithStats.filter((p) => p.status === "active").length;
  const overlayOpen = createOpen || editOpen;
  const showQuickAdd = authenticated && !error && !overlayOpen && !selectedProject;

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden rounded-2xl border border-arlo-border bg-white text-gray-900 shadow-[0_8px_32px_rgba(0,0,0,0.12)]">
      <header className="border-b border-arlo-border px-4 pb-3 pt-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-base leading-none">{getGreetingIcon()}</span>
              <h1 className="text-[15px] font-semibold text-gray-900">
                {selectedProject ? selectedProject.name : getGreeting()}
              </h1>
            </div>
            <p className="mt-1 text-[11px] leading-relaxed text-arlo-muted">
              {loading
                ? "Loading tasks…"
                : authenticated
                  ? selectedProject
                    ? `${selectedProject.completedTaskCount} of ${selectedProject.taskCount} tasks done`
                    : `${incompleteCount} task${incompleteCount === 1 ? "" : "s"} remaining${activeProjects > 0 ? ` · ${activeProjects} active project${activeProjects === 1 ? "" : "s"}` : ""}${todayTasks.length > 0 ? ` · ${progress.percent}% done today` : ""}`
                  : "Not signed in"}
            </p>
          </div>
          {authenticated && !selectedProject && todayTasks.length > 0 && (
            <span className="rounded-full border border-arlo-border bg-arlo-surface px-2 py-0.5 text-[10px] font-medium text-arlo-muted">
              {progress.percent}%
            </span>
          )}
        </div>

        {authenticated && !selectedProject && (
          <ViewTabs active={view} onChange={setView} counts={viewCounts} />
        )}
      </header>

      <main className="flex min-h-0 flex-1 flex-col">
        {loading && authenticated && (
          <div className="flex flex-1 items-center justify-center text-sm text-arlo-muted">
            Loading…
          </div>
        )}

        {!loading && !authenticated && (
          <SignedOut onAuthComplete={() => void refresh()} />
        )}

        {!loading && authenticated && error && (
          <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
            <p className="text-sm text-red-600">
              {sessionExpired ? "Session expired — sign in again" : error}
            </p>
            <button
              type="button"
              onClick={() => void refresh()}
              className="mt-3 text-xs font-medium text-arlo-blue hover:underline"
            >
              Retry
            </button>
          </div>
        )}

        {!loading && authenticated && !error && selectedProject && (
          <ProjectDetailView
            project={selectedProject}
            tasks={selectedProjectTasks}
            projects={projects}
            subtasksByTask={subtasksByTask}
            onBack={() => setSelectedProjectId(null)}
            onAddTask={() => openCreateDialog("", selectedProject.id)}
            onToggle={(id, done) => void toggleTask(id, done)}
            onSubtaskToggle={(id, done) => void toggleSubtask(id, done)}
            onEditTask={openEditDialog}
          />
        )}

        {!loading && authenticated && !error && !selectedProject && view !== "projects" && (
          <TaskList
            tasks={viewTasks}
            projects={projects}
            subtasksByTask={subtasksByTask}
            view={view}
            onToggle={(id, done) => void toggleTask(id, done)}
            onSubtaskToggle={(id, done) => void toggleSubtask(id, done)}
            onEditTask={openEditDialog}
          />
        )}

        {!loading && authenticated && !error && !selectedProject && view === "projects" && (
          <ProjectListView
            projects={projectsWithStats}
            onProjectClick={handleProjectClick}
          />
        )}
      </main>

      {showQuickAdd && (
        <QuickAdd
          onCreate={handleQuickCreate}
          onOpenFullForm={openCreateDialog}
        />
      )}

      {authenticated && !error && (
        <CreateTaskDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          projects={projectsList}
          initialTitle={draftTitle}
          defaultProjectId={createProjectId}
          onCreate={handleCreate}
        />
      )}

      {authenticated && !error && (
        <EditTaskDialog
          task={editingTask}
          open={editOpen}
          onOpenChange={(open) => {
            setEditOpen(open);
            if (!open) setEditingTask(null);
          }}
          projects={projectsList}
          onSave={handleSaveTask}
          onDelete={handleDeleteTask}
        />
      )}

      <footer className="flex items-center justify-between border-t border-arlo-border px-4 py-2">
        <button
          type="button"
          onClick={() => void openUrl(`${getArloWebUrl()}/productivity`)}
          className="text-[11px] font-medium text-arlo-muted transition hover:text-gray-900"
        >
          Open Arlo →
        </button>
        {authenticated && (
          <button
            type="button"
            onClick={() => void signOut()}
            className="text-[11px] text-arlo-faint transition hover:text-arlo-muted"
          >
            Sign out
          </button>
        )}
      </footer>
    </div>
  );
}

export default App;
