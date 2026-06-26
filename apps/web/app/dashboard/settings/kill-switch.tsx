"use client";

import { useState, useTransition } from "react";
import { setPublishingPaused } from "./actions";

export function KillSwitch({ initialPaused }: { initialPaused: boolean }) {
  const [paused, setPaused] = useState(initialPaused);
  const [isPending, startTransition] = useTransition();

  function toggle() {
    const next = !paused;
    setPaused(next); // optimistic
    startTransition(async () => {
      try {
        await setPublishingPaused(next);
      } catch {
        setPaused(!next); // revert on failure
      }
    });
  }

  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem",
      padding: "1rem 1.125rem", borderRadius: "var(--radius)",
      border: `1px solid ${paused ? "rgba(248,113,113,0.35)" : "var(--border)"}`,
      background: paused ? "rgba(248,113,113,0.06)" : "var(--surface)",
      transition: "border-color 0.15s, background 0.15s",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
        <div style={{
          width: 34, height: 34, borderRadius: 9, flexShrink: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: paused ? "rgba(248,113,113,0.15)" : "rgba(74,222,128,0.12)",
          color: paused ? "#f87171" : "#4ade80",
        }}>
          {paused ? (
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="6" y="4" width="4" height="16" rx="1" /><rect x="14" y="4" width="4" height="16" rx="1" />
            </svg>
          ) : (
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          )}
        </div>
        <div>
          <p style={{ margin: 0, fontWeight: 600, fontSize: "0.9rem", color: "var(--fg)" }}>
            {paused ? "Publishing paused" : "Publishing active"}
          </p>
          <p style={{ margin: "2px 0 0", fontSize: "0.75rem", color: "var(--muted)", lineHeight: 1.5 }}>
            {paused
              ? "All posts are on hold — nothing will go out until you resume."
              : "Approved & autopilot posts publish on schedule."}
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={toggle}
        disabled={isPending}
        style={{
          flexShrink: 0,
          fontSize: "0.8rem", fontWeight: 600,
          padding: "0.5rem 1rem", borderRadius: 9,
          cursor: "pointer",
          opacity: isPending ? 0.6 : 1,
          background: paused ? "rgba(74,222,128,0.15)" : "rgba(248,113,113,0.12)",
          border: `1px solid ${paused ? "rgba(74,222,128,0.3)" : "rgba(248,113,113,0.3)"}`,
          color: paused ? "#4ade80" : "#f87171",
        }}
      >
        {paused ? "Resume publishing" : "Pause all publishing"}
      </button>
    </div>
  );
}
