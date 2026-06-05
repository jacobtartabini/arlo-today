import { useCallback, useRef, useState } from "react";

interface QuickAddProps {
  onCreate: (title: string) => Promise<boolean>;
  onOpenFullForm?: (title: string) => void;
}

export function QuickAdd({ onCreate, onOpenFullForm }: QuickAddProps) {
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = useCallback(async () => {
    const trimmed = title.trim();
    if (!trimmed || loading) return;

    setLoading(true);
    const ok = await onCreate(trimmed);
    setLoading(false);

    if (ok) {
      setTitle("");
      inputRef.current?.focus();
    }
  }, [title, loading, onCreate]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        void handleSubmit();
      }
    },
    [handleSubmit]
  );

  return (
    <div className="border-t border-arlo-border px-4 py-3">
      <div className="flex items-center gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-arlo-border bg-white px-3 py-2.5 shadow-sm">
          <span className="text-arlo-faint">+</span>
          <input
            ref={inputRef}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Add a task…"
            disabled={loading}
            className="min-w-0 flex-1 bg-transparent text-sm text-gray-900 placeholder:text-arlo-faint outline-none"
          />
          <span className="shrink-0 text-[11px] text-arlo-faint">
            {loading ? "Adding…" : "Enter"}
          </span>
        </div>
        {onOpenFullForm && (
          <button
            type="button"
            onClick={() => onOpenFullForm(title)}
            title="New task with settings"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-arlo-border bg-white text-arlo-muted shadow-sm transition hover:border-arlo-blue hover:text-arlo-blue"
          >
            <SettingsIcon />
          </button>
        )}
      </div>
    </div>
  );
}

function SettingsIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M2 4h12M2 8h12M2 12h12" strokeLinecap="round" />
      <circle cx="5" cy="4" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="10" cy="8" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="7" cy="12" r="1.2" fill="currentColor" stroke="none" />
    </svg>
  );
}
