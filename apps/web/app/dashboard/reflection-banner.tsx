"use client";

import { useState, useTransition } from "react";
import { submitReflection, type ReflectionResponses } from "./reflection/actions";

const QUESTIONS: { key: keyof ReflectionResponses; label: string; placeholder: string }[] = [
  {
    key: "best_performing",
    label: "What content performed best this week?",
    placeholder: "The thread about fundraising got crazy engagement...",
  },
  {
    key: "audience_reaction",
    label: "How did your audience react overall?",
    placeholder: "More comments than usual, lots of DMs from founders...",
  },
  {
    key: "wins",
    label: "Any wins or milestones to shout about?",
    placeholder: "Hit 500 followers, landed a partnership call from a post...",
  },
  {
    key: "next_week_focus",
    label: "What do you want to focus on next week?",
    placeholder: "Go deeper on the product-market fit angle, less generic advice...",
  },
  {
    key: "anything_else",
    label: "Anything else Influuc should know?",
    placeholder: "Avoid posting about X topic for now, big launch on Thursday...",
  },
];

export function ReflectionBanner() {
  const [open, setOpen] = useState(false);
  const [responses, setResponses] = useState<ReflectionResponses>({
    best_performing: "",
    audience_reaction: "",
    wins: "",
    next_week_focus: "",
    anything_else: "",
  });
  const [isPending, startTransition] = useTransition();
  const [done, setDone] = useState(false);

  function handleSubmit() {
    startTransition(async () => {
      await submitReflection(responses);
      setDone(true);
      setOpen(false);
    });
  }

  if (done) {
    return (
      <div style={{
        background: "linear-gradient(135deg, #0f2027, #203a43, #2c5364)",
        border: "1px solid #00ff9d33",
        borderRadius: 12,
        padding: "20px 24px",
        marginBottom: 24,
        display: "flex",
        alignItems: "center",
        gap: 12,
      }}>
        <span style={{ fontSize: 24 }}>⚡</span>
        <div>
          <div style={{ color: "#00ff9d", fontWeight: 600, fontSize: 15 }}>New week generating...</div>
          <div style={{ color: "#888", fontSize: 13, marginTop: 2 }}>Your reflection is being woven into this week's content strategy.</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ marginBottom: 24 }}>
      {/* Banner */}
      <div
        style={{
          background: "linear-gradient(135deg, #1a0533, #2d1b69, #1a0533)",
          border: "1px solid #a855f7aa",
          borderRadius: 12,
          padding: "18px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          cursor: open ? "default" : "pointer",
        }}
        onClick={() => !open && setOpen(true)}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 28 }}>🔮</span>
          <div>
            <div style={{ color: "#e9d5ff", fontWeight: 700, fontSize: 16 }}>Your new week is ready to generate</div>
            <div style={{ color: "#a78bfa", fontSize: 13, marginTop: 2 }}>
              Quick reflection first — it takes 2 min and makes your content 10× better
            </div>
          </div>
        </div>
        {!open && (
          <button
            style={{
              background: "#7c3aed",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              padding: "10px 20px",
              fontWeight: 600,
              fontSize: 14,
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            Reflect &amp; Generate →
          </button>
        )}
      </div>

      {/* Expanded form */}
      {open && (
        <div style={{
          background: "#111",
          border: "1px solid #a855f744",
          borderTop: "none",
          borderRadius: "0 0 12px 12px",
          padding: 24,
        }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {QUESTIONS.map((q) => (
              <div key={q.key}>
                <label style={{ display: "block", color: "#d1d5db", fontSize: 13, fontWeight: 500, marginBottom: 6 }}>
                  {q.label}
                </label>
                <textarea
                  placeholder={q.placeholder}
                  value={responses[q.key]}
                  onChange={(e) => setResponses((r) => ({ ...r, [q.key]: e.target.value }))}
                  rows={2}
                  style={{
                    width: "100%",
                    background: "#1a1a1a",
                    border: "1px solid #333",
                    borderRadius: 8,
                    padding: "10px 12px",
                    color: "#f3f4f6",
                    fontSize: 14,
                    resize: "vertical",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
              </div>
            ))}

            <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 4 }}>
              <button
                onClick={() => setOpen(false)}
                style={{
                  background: "transparent",
                  border: "1px solid #333",
                  color: "#888",
                  borderRadius: 8,
                  padding: "10px 20px",
                  cursor: "pointer",
                  fontSize: 14,
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={isPending}
                style={{
                  background: isPending ? "#4c1d95" : "#7c3aed",
                  color: "#fff",
                  border: "none",
                  borderRadius: 8,
                  padding: "10px 24px",
                  fontWeight: 600,
                  fontSize: 14,
                  cursor: isPending ? "not-allowed" : "pointer",
                  opacity: isPending ? 0.7 : 1,
                }}
              >
                {isPending ? "Generating..." : "Generate this week's content →"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
