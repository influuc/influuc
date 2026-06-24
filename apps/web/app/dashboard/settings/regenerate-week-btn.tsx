"use client";

import { useState, useTransition } from "react";
import { triggerWeeklyRegenerate } from "../actions";

export function RegenerateWeekBtn() {
  const [isPending, startTransition] = useTransition();
  const [state, setState] = useState<"idle" | "done" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  function handleClick() {
    startTransition(async () => {
      try {
        await triggerWeeklyRegenerate();
        setState("done");
        setTimeout(() => setState("idle"), 4000);
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : "Failed to trigger regeneration");
        setState("error");
        setTimeout(() => setState("idle"), 5000);
      }
    });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending || state === "done"}
        className="btn btn-ghost btn-sm"
        style={{ width: "fit-content", opacity: isPending || state === "done" ? 0.6 : 1 }}
      >
        {isPending ? "Starting…" : state === "done" ? "✓ Triggered" : "↺ Regenerate this week"}
      </button>
      {state === "done" && (
        <p style={{ fontSize: "0.78rem", color: "var(--success)", margin: 0 }}>
          Regeneration started — new posts will replace your current drafts in a few minutes.
        </p>
      )}
      {state === "error" && (
        <p style={{ fontSize: "0.78rem", color: "var(--error)", margin: 0 }}>{errorMsg}</p>
      )}
      <p style={{ fontSize: "0.75rem", color: "var(--muted)", margin: 0, lineHeight: 1.5 }}>
        Discards draft posts and generates a fresh week of content using your current settings and Founder Brain.
      </p>
    </div>
  );
}
