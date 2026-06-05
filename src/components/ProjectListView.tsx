import type { ProjectWithStats } from "@/lib/task-filters";

interface ProjectListViewProps {
  projects: ProjectWithStats[];
  onProjectClick: (project: ProjectWithStats) => void;
}

const STATUS_LABELS: Record<string, string> = {
  active: "Active",
  on_hold: "On hold",
  completed: "Completed",
  archived: "Archived",
};

export function ProjectListView({ projects, onProjectClick }: ProjectListViewProps) {
  if (projects.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-arlo-surface">
          <FolderIcon />
        </div>
        <p className="text-sm font-medium text-gray-700">No projects yet</p>
        <p className="mt-1 text-xs text-arlo-muted">Create projects in Arlo to organize tasks here</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center justify-between px-4 pb-1 pt-2">
        <span className="text-[10px] font-semibold tracking-wider text-arlo-faint">PROJECTS</span>
        <span className="text-[11px] text-arlo-muted">{projects.length} total</span>
      </div>
      <div className="flex-1 overflow-y-auto px-3 pb-2">
        {projects.map((project) => (
          <button
            key={project.id}
            type="button"
            onClick={() => onProjectClick(project)}
            className="mb-2 w-full rounded-xl border border-arlo-border bg-white p-3 text-left shadow-sm transition hover:border-arlo-blue/40 hover:shadow-md"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <span
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                  style={{ backgroundColor: `${project.color}20`, color: project.color }}
                >
                  <FolderIcon />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-semibold text-gray-900">{project.name}</p>
                  <p className="text-[11px] text-arlo-muted">
                    {project.completedTaskCount} of {project.taskCount} tasks
                  </p>
                </div>
              </div>
              <span className="shrink-0 rounded-full border border-arlo-border bg-arlo-surface px-2 py-0.5 text-[10px] font-medium text-arlo-muted">
                {STATUS_LABELS[project.status] ?? project.status}
              </span>
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
          </button>
        ))}
      </div>
    </div>
  );
}

function FolderIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M2 4.5A1.5 1.5 0 0 1 3.5 3H6l1.5 2h5A1.5 1.5 0 0 1 14 6.5v6A1.5 1.5 0 0 1 12.5 14h-9A1.5 1.5 0 0 1 2 12.5v-8z" />
    </svg>
  );
}
