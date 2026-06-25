"use client";

import { useState, useTransition } from "react";
import { submitReflection, type ReflectionResponses } from "./reflection/actions";

const QUESTIONS: { key: keyof ReflectionResponses; label: string; sub: string; placeholder: string }[] = [
  {
    key: "best_performing",
    label: "What content hit hardest?",
    sub: "Posts, threads, or formats that got the most traction",
    placeholder: "The fundraising thread blew up — 40 reposts, 200 likes…",
  },
  {
    key: "audience_reaction",
    label: "How did your audience respond?",
    sub: "DMs, comments, replies, tone of the conversation",
    placeholder: "More DMs than usual asking about the product, positive vibe in comments…",
  },
  {
    key: "wins",
    label: "Any wins or milestones this week?",
    sub: "Followers, leads, revenue, calls, partnerships — anything notable",
    placeholder: "Crossed 2k followers, landed a discovery call from a post…",
  },
  {
    key: "next_week_focus",
    label: "What should next week focus on?",
    sub: "Topics, angles, or narratives to double down on",
    placeholder: "Go deeper on product-led growth, less generic startup advice…",
  },
  {
    key: "anything_else",
    label: "Anything the AI should know?",
    sub: "Launches, events, things to avoid, tone shifts",
    placeholder: "Big launch Thursday so build hype, avoid competitor mentions this week…",
  },
];

export function ReflectionBanner() {
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

  return (
    <>
      {/* Blocking overlay */}
      <div style={{
        position: "fixed", inset: 0, zIndex: 500,
        background: "rgba(7,7,15,0.88)",
        backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
      }} />

      {/* Modal */}
      <div style={{
        position: "fixed", inset: 0, zIndex: 501,
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "1.5rem",
        overflowY: "auto",
      }}>
        <div style={{
          width: "100%", maxWidth: 660,
          background: "#0d0d1b",
          borderRadius: 20,
          boxShadow: "0 40px 120px rgba(0,0,0,0.9), 0 0 0 1px rgba(109,107,245,0.2)",
          overflow: "hidden",
        }}>

          {/* Header */}
          <div style={{
            padding: "2rem 2rem 1.5rem",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
            background: "linear-gradient(135deg, rgba(109,107,245,0.08) 0%, transparent 60%)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.875rem", marginBottom: "0.875rem" }}>
              <div style={{
                width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                background: "linear-gradient(135deg, rgba(109,107,245,0.3), rgba(109,107,245,0.1))",
                border: "1px solid rgba(109,107,245,0.3)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(109,107,245,1)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              </div>
              <div>
                <p style={{ fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(109,107,245,0.8)", margin: 0 }}>
                  Weekly Reflection
                </p>
                <h2 style={{ fontSize: "1.2rem", fontWeight: 700, color: "var(--fg)", margin: "0.15rem 0 0", letterSpacing: "-0.02em" }}>
                  Your week is done. Let&apos;s build next week.
                </h2>
              </div>
            </div>
            <p style={{ fontSize: "0.82rem", color: "var(--muted)", margin: 0, lineHeight: 1.6 }}>
              Takes 2 minutes. Your answers directly shape the strategy and content generated for next week — the more specific, the better the output.
            </p>
          </div>

          {done ? (
            /* Done state */
            <div style={{
              padding: "3rem 2rem",
              display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem", textAlign: "center",
            }}>
              <div style={{
                width: 56, height: 56, borderRadius: "50%",
                background: "rgba(74,222,128,0.12)",
                border: "1px solid rgba(74,222,128,0.25)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <div>
                <p style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--fg)", margin: 0 }}>Generating your next week</p>
                <p style={{ fontSize: "0.82rem", color: "var(--muted)", margin: "0.35rem 0 0" }}>
                  Content will be ready in ~60 seconds. The page will refresh automatically.
                </p>
              </div>
            </div>
          ) : (
            /* Form */
            <div style={{ padding: "1.5rem 2rem 2rem", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              {QUESTIONS.map((q, i) => (
                <div key={q.key}>
                  <div style={{ marginBottom: "0.5rem" }}>
                    <div style={{ display: "flex", alignItems: "baseline", gap: "0.5rem" }}>
                      <span style={{
                        fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.08em",
                        color: "rgba(109,107,245,0.6)", minWidth: 16,
                      }}>
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <label style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--fg)" }}>
                        {q.label}
                      </label>
                    </div>
                    <p style={{ fontSize: "0.72rem", color: "var(--muted)", margin: "0.2rem 0 0 1.5rem" }}>
                      {q.sub}
                    </p>
                  </div>
                  <textarea
                    placeholder={q.placeholder}
                    value={responses[q.key]}
                    onChange={(e) => setResponses(r => ({ ...r, [q.key]: e.target.value }))}
                    rows={2}
                    disabled={isPending}
                    style={{
                      width: "100%", boxSizing: "border-box",
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: 10,
                      padding: "0.75rem 0.875rem",
                      color: "var(--fg)",
                      fontSize: "0.85rem",
                      resize: "vertical",
                      outline: "none",
                      fontFamily: "inherit",
                      lineHeight: 1.65,
                      transition: "border-color 0.15s",
                    }}
                    onFocus={e => (e.target.style.borderColor = "rgba(109,107,245,0.45)")}
                    onBlur={e => (e.target.style.borderColor = "rgba(255,255,255,0.08)")}
                  />
                </div>
              ))}

              <div style={{
                marginTop: "0.25rem",
                paddingTop: "1.25rem",
                borderTop: "1px solid rgba(255,255,255,0.06)",
                display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem",
              }}>
                <p style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.25)", margin: 0 }}>
                  Skipping fields is fine — any context helps.
                </p>
                <button
                  onClick={handleSubmit}
                  disabled={isPending}
                  style={{
                    padding: "0.75rem 1.75rem",
                    borderRadius: 10, border: "none",
                    background: isPending ? "rgba(109,107,245,0.5)" : "var(--accent)",
                    color: "#fff",
                    fontSize: "0.875rem", fontWeight: 700,
                    cursor: isPending ? "not-allowed" : "pointer",
                    boxShadow: isPending ? "none" : "0 0 24px rgba(109,107,245,0.4)",
                    transition: "all 0.15s",
                    whiteSpace: "nowrap",
                    fontFamily: "inherit",
                    flexShrink: 0,
                  }}
                >
                  {isPending ? "Generating…" : "Generate next week →"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
