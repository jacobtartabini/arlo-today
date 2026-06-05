import { useRef, useState } from "react";
import { completeAuthFromToken, completeAuthFromUrl, startSignIn } from "@/lib/auth";

interface SignedOutProps {
  onAuthComplete: () => void;
}

type State = "idle" | "waiting" | "validating" | "error";

export function SignedOut({ onAuthComplete }: SignedOutProps) {
  const [state, setState] = useState<State>("idle");
  const [pasteValue, setPasteValue] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSignIn = async () => {
    setState("waiting");
    setErrorMsg(null);
    setPasteValue("");
    await startSignIn();
  };

  const submitValue = async (raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed) return;

    setState("validating");
    setErrorMsg(null);

    const isUrl = trimmed.startsWith("arlo-menubar://") || trimmed.includes("://");
    const ok = isUrl
      ? await completeAuthFromUrl(trimmed)
      : await completeAuthFromToken(trimmed);

    if (ok) {
      onAuthComplete();
    } else {
      setState("error");
      setErrorMsg(
        isUrl
          ? "Could not extract a valid token from that URL. Copy the full address bar URL after login."
          : "Token is invalid or expired. Copy a fresh one from Arlo."
      );
      setPasteValue("");
      setTimeout(() => {
        setState("waiting");
        inputRef.current?.focus();
      }, 3000);
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").trim();
    setPasteValue(pasted);
    if (pasted) void submitValue(pasted);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") void submitValue(pasteValue);
  };

  if (state === "idle") {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50 text-xl">
          ◎
        </div>
        <h2 className="text-[15px] font-semibold text-gray-900">Sign in to Arlo</h2>
        <p className="mt-1.5 max-w-[240px] text-xs leading-relaxed text-arlo-muted">
          Open Arlo Settings to copy your token, then paste it here.
        </p>
        <button
          type="button"
          onClick={() => void handleSignIn()}
          className="mt-5 w-full max-w-[240px] rounded-xl bg-arlo-blue px-4 py-2.5 text-sm font-medium text-white transition hover:bg-arlo-blue-hover active:scale-[0.98]"
        >
          Open Arlo Settings
        </button>
        <button
          type="button"
          onClick={() => setState("waiting")}
          className="mt-3 text-[11px] font-medium text-arlo-blue hover:underline"
        >
          Already have a token? Paste it
        </button>
      </div>
    );
  }

  const isValidating = state === "validating";

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl border border-blue-100 bg-blue-50">
        {isValidating ? (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-blue-200 border-t-arlo-blue" />
        ) : (
          <span className="text-base">◎</span>
        )}
      </div>

      <h2 className="text-sm font-semibold text-gray-900">
        {isValidating ? "Verifying…" : state === "waiting" && pasteValue ? "Paste your token" : "Arlo Settings opened"}
      </h2>
      <p className="mt-1 max-w-[240px] text-xs leading-relaxed text-arlo-muted">
        {isValidating
          ? "Checking your token."
          : "Copy your token from Arlo Settings, then paste it below."}
      </p>

      {!isValidating && (
        <div className="mt-4 w-full max-w-[260px] text-left">
          <input
            ref={inputRef}
            type="text"
            value={pasteValue}
            onChange={(e) => setPasteValue(e.target.value)}
            onPaste={handlePaste}
            onKeyDown={handleKeyDown}
            placeholder="Paste token or callback URL…"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            className={[
              "w-full rounded-xl border px-3 py-2 text-[11px] text-gray-800 outline-none transition",
              "bg-white placeholder:text-arlo-faint",
              state === "error"
                ? "border-red-300 focus:border-red-400"
                : "border-arlo-border focus:border-arlo-blue",
            ].join(" ")}
          />

          {errorMsg && (
            <p className="mt-1.5 text-[11px] leading-relaxed text-red-600">{errorMsg}</p>
          )}

          {pasteValue && state === "waiting" && (
            <button
              type="button"
              onClick={() => void submitValue(pasteValue)}
              className="mt-2 w-full rounded-xl border border-arlo-border px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-arlo-surface"
            >
              Continue
            </button>
          )}

          <div className="mt-3 rounded-xl border border-arlo-border bg-arlo-surface px-3 py-2.5">
            <p className="text-[10px] leading-relaxed text-arlo-muted">
              In Arlo&apos;s browser console, run:
            </p>
            <code className="mt-1 block select-all text-[10px] text-gray-600">
              copy(sessionStorage.getItem(&apos;arlo_auth_token&apos;))
            </code>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => { setState("idle"); setPasteValue(""); setErrorMsg(null); }}
        className="mt-4 text-[11px] text-arlo-faint transition hover:text-arlo-muted"
      >
        Cancel
      </button>
    </div>
  );
}
