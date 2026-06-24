"use client";

import { useState, useTransition } from "react";
import { submitReflection, type ReflectionResponses } from "./reflection/actions";

const QUESTIONS: { key: keyof ReflectionResponses; label: string; placeholder: string }[] = [
  { key: "best_performing",    label: "What content performed best?",       placeholder: "The fundraising thread got a lot of reposts…" },
  { key: "audience_reaction",  label: "How did your audience react?",        placeholder: "More DMs than usual, positive comments on…" },
  { key: "wins",               label: "Any wins or milestones?",             placeholder: "Hit 1k followers, landed a call from a post…" },
  { key: "next_week_focus",    label: "Focus for next week?",                placeholder: "Go deeper on product-market fit, less generic…" },
  { key: "anything_else",      label: "Anything else to know?",              placeholder: "Big launch Thursday, avoid competitor mentions…" },
];

export function ReflectionBanner() {
  const [open, setOpen] = useState(false);
  const [responses, setResponses] = useState<ReflectionResponses>({
    best_performing: "", audience_reaction: "", wins: "", next_week_focus: "", anything_else: "",
  });
  const [isPending, startTransition] = useTransition();
  const [done, setDone] = useState(false);

  function handleSubmit() {
    startTransition(async () => {
      await submitReflection(responses);
      setDone(true);
    });
  }

  if (done) {
    return (
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: "0.875rem",
        padding: "1rem 1.25rem",
        borderRadius: "var(--radius)",
        background: "var(--card)",
        border: "1px solid rgba(74,222,128,0.2)",
      }}>
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--success)", flexShrink: 0 }} />
        <div>
          <p style={{ fontWeight: 600, fontSize: "0.875rem", color: "var(--fg)", margin: 0 }}>
            Generating your new week
          </p>
          <p style={{ fontSize: "0.775rem", color: "var(--muted)", margin: "0.15rem 0 0" }}>
            Reflection received. New content will be ready in ~60 seconds.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {/* Banner row */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "1rem",
        padding: "1rem 1.25rem",
        borderRadius: open ? "var(--radius) var(--radius) 0 0" : "var(--radius)",
        background: "var(--card)",
        border: "1px solid rgba(109,107,245,0.25)",
        borderBottom: open ? "1px solid var(--border)" : undefined,
        cursor: open ? "default" : "pointer",
        transition: "border-radius 0.15s",
      }}
        onClick={() => !open && setOpen(true)}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.875rem" }}>
          <div style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: "var(--accent)",
            boxShadow: "0 0 8px var(--accent)",
            flexShrink: 0,
          }} />
          <div>
            <p style={{ fontWeight: 600, fontSize: "0.875rem", color: "var(--fg)", margin: 0 }}>
              New week ready to generate
            </p>
            <p style={{ fontSize: "0.775rem", color: "var(--muted)", margin: "0.15rem 0 0" }}>
              Quick reflection first — 2 min, makes content 10× better
            </p>
          </div>
        </div>
        {!open && (
          <button
            style={{
              padding: "0.5rem 1.125rem",
              borderRadius: "var(--radius-sm)",
              background: "var(--accent)",
              color: "#fff",
              border: "none",
              fontSize: "0.82rem",
              fontWeight: 600,
              cursor: "pointer",
              whiteSpace: "nowrap",
              flexShrink: 0,
              fontFamily: "inherit",
            }}
          >
            Reflect & Generate
          </button>
        )}
      </div>

      {/* Expanded form */}
      {open && (
        <div style={{
          background: "var(--card)",
          border: "1px solid rgba(109,107,245,0.25)",
          borderTop: "none",
          borderRadius: "0 0 var(--radius) var(--radius)",
          padding: "1.5rem 1.25rem",
          display: "flex",
          flexDirection: "column",
          gap: "1.25rem",
        }}>
          {QUESTIONS.map((q) => (
            <div key={q.key} style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
              <label style={{ fontSize: "0.8rem", fontWeight: 500, color: "var(--fg)" }}>
                {q.label}
              </label>
              <textarea
                placeholder={q.placeholder}
                value={responses[q.key]}
                onChange={(e) => setResponses(r => ({ ...r, [q.key]: e.target.value }))}
                rows={2}
                style={{
                  width: "100%",
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid var(--border-med)",
                  borderRadius: "var(--radius-sm)",
                  padding: "0.625rem 0.75rem",
                  color: "var(--fg)",
                  fontSize: "0.85rem",
                  resize: "vertical",
                  outline: "none",
                  boxSizing: "border-box",
                  fontFamily: "inherit",
                  lineHeight: 1.6,
                }}
              />
            </div>
          ))}

          <div style={{ display: "flex", gap: "0.625rem", justifyContent: "flex-end" }}>
            <button
              onClick={() => setOpen(false)}
              style={{
                background: "transparent",
                border: "1px solid var(--border-med)",
                color: "var(--muted)",
                borderRadius: "var(--radius-sm)",
                padding: "0.5rem 1rem",
                cursor: "pointer",
                fontSize: "0.82rem",
                fontFamily: "inherit",
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={isPending}
              style={{
                background: isPending ? "rgba(109,107,245,0.6)" : "var(--accent)",
                color: "#fff",
                border: "none",
                borderRadius: "var(--radius-sm)",
                padding: "0.5rem 1.25rem",
                fontWeight: 600,
                fontSize: "0.82rem",
                cursor: isPending ? "not-allowed" : "pointer",
                fontFamily: "inherit",
              }}
            >
              {isPending ? "Generating…" : "Generate this week →"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
