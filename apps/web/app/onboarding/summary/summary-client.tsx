"use client";

import { useState, useTransition } from "react";
import { confirmFact, editFact, dismissFact, advanceToPaywall } from "./actions";

interface Fact {
  id: string;
  layer: string;
  key: string;
  content: string;
  confidence: number;
  status: string;
}

interface SummaryClientProps {
  grouped: Record<string, Fact[]>;
  layerOrder: string[];
  layerLabels: Record<string, string>;
  initialConfirmedCount: number;
}

export function SummaryClient({
  grouped,
  layerOrder,
  layerLabels,
  initialConfirmedCount,
}: SummaryClientProps) {
  const [confirmedCount, setConfirmedCount] = useState(initialConfirmedCount);
  const [isPending, startTransition] = useTransition();
  const [factStates, setFactStates] = useState<
    Record<string, { status: string; content: string; editing: boolean; draft: string }>
  >(() => {
    const init: Record<string, { status: string; content: string; editing: boolean; draft: string }> = {};
    for (const layer of layerOrder) {
      for (const fact of grouped[layer] ?? []) {
        init[fact.id] = {
          status: fact.status,
          content: fact.content,
          editing: false,
          draft: fact.content,
        };
      }
    }
    return init;
  });

  type FS = { status: string; content: string; editing: boolean; draft: string };

  function patchFact(id: string, patch: Partial<FS>) {
    setFactStates((s): Record<string, FS> => {
      const prev = s[id];
      if (!prev) return s;
      const updated: FS = {
        status: patch.status ?? prev.status,
        content: patch.content ?? prev.content,
        editing: patch.editing ?? prev.editing,
        draft: patch.draft ?? prev.draft,
      };
      return Object.assign({}, s, { [id]: updated });
    });
  }

  function handleConfirm(factId: string) {
    const current = factStates[factId];
    if (!current || current.status === "active") return;
    patchFact(factId, { status: "active" });
    setConfirmedCount((c) => c + 1);
    startTransition(() => confirmFact(factId));
  }

  function handleStartEdit(factId: string) {
    const current = factStates[factId];
    if (!current) return;
    patchFact(factId, { editing: true, draft: current.content });
  }

  function handleSaveEdit(factId: string) {
    const draft = factStates[factId]?.draft ?? "";
    if (!draft.trim()) return;
    const wasActive = factStates[factId]?.status === "active";
    patchFact(factId, { editing: false, content: draft, status: "active" });
    if (!wasActive) setConfirmedCount((c) => c + 1);
    startTransition(() => editFact(factId, draft));
  }

  function handleDismiss(factId: string) {
    const wasActive = factStates[factId]?.status === "active";
    patchFact(factId, { status: "rejected" });
    if (wasActive) setConfirmedCount((c) => Math.max(0, c - 1));
    startTransition(() => dismissFact(factId));
  }

  const canContinue = confirmedCount > 0;

  return (
    <div
      style={{
        width: "100%",
        maxWidth: "640px",
        display: "flex",
        flexDirection: "column",
        gap: "2rem",
      }}
    >
      {/* Confirmed count */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0.875rem 1.25rem",
          borderRadius: "0.625rem",
          background: "rgba(109,107,245,0.08)",
          border: "1px solid rgba(109,107,245,0.2)",
        }}
      >
        <span style={{ fontSize: "0.88rem", fontWeight: 600 }}>
          {confirmedCount} fact{confirmedCount !== 1 ? "s" : ""} confirmed
        </span>
        {canContinue && (
          <form action={advanceToPaywall}>
            <button
              type="submit"
              disabled={isPending}
              style={{
                padding: "0.5rem 1.25rem",
                borderRadius: "0.5rem",
                background: "var(--accent)",
                color: "#fff",
                fontWeight: 700,
                fontSize: "0.88rem",
                border: "none",
                cursor: "pointer",
              }}
            >
              Continue to paywall →
            </button>
          </form>
        )}
      </div>

      {/* Layer groups */}
      {layerOrder.map((layer) => {
        const facts = (grouped[layer] ?? []).filter(
          (f) => factStates[f.id]?.status !== "rejected"
        );
        if (facts.length === 0) return null;

        return (
          <div key={layer} style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            <h2
              style={{
                fontSize: "0.72rem",
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                color: "var(--muted)",
                fontWeight: 700,
                margin: 0,
              }}
            >
              {layerLabels[layer] ?? layer}
            </h2>

            {facts.map((fact) => {
              const state = factStates[fact.id];
              if (!state) return null;
              const isConfirmed = state.status === "active";
              const isEditing = state.editing;

              return (
                <div
                  key={fact.id}
                  style={{
                    padding: "1rem 1.25rem",
                    borderRadius: "0.75rem",
                    border: `1px solid ${isConfirmed ? "rgba(74,222,128,0.25)" : "rgba(255,255,255,0.1)"}`,
                    background: isConfirmed
                      ? "rgba(74,222,128,0.04)"
                      : "rgba(255,255,255,0.03)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.625rem",
                  }}
                >
                  {/* Confidence badge */}
                  <div
                    style={{
                      fontSize: "0.68rem",
                      color: "var(--muted)",
                      textAlign: "right",
                    }}
                  >
                    {Math.round((fact.confidence ?? 0.5) * 100)}% confidence
                  </div>

                  {/* Content (editable or static) */}
                  {isEditing ? (
                    <textarea
                      value={state.draft}
                      onChange={(e) => patchFact(fact.id, { draft: e.target.value })}
                      rows={3}
                      autoFocus
                      style={{
                        padding: "0.625rem 0.75rem",
                        borderRadius: "0.5rem",
                        border: "1px solid rgba(109,107,245,0.4)",
                        background: "rgba(109,107,245,0.06)",
                        color: "var(--foreground)",
                        fontSize: "0.88rem",
                        resize: "vertical",
                        outline: "none",
                        width: "100%",
                      }}
                    />
                  ) : (
                    <p
                      style={{
                        fontSize: "0.9rem",
                        lineHeight: 1.6,
                        margin: 0,
                        color: isConfirmed ? "var(--foreground)" : "rgba(255,255,255,0.75)",
                      }}
                    >
                      {state.content}
                    </p>
                  )}

                  {/* Action buttons */}
                  <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                    {isEditing ? (
                      <>
                        <ActionButton
                          onClick={() => handleSaveEdit(fact.id)}
                          variant="primary"
                        >
                          Save
                        </ActionButton>
                        <ActionButton
                          onClick={() => patchFact(fact.id, { editing: false })}
                          variant="ghost"
                        >
                          Cancel
                        </ActionButton>
                      </>
                    ) : (
                      <>
                        {!isConfirmed && (
                          <ActionButton
                            onClick={() => handleConfirm(fact.id)}
                            variant="confirm"
                          >
                            ✓ That&apos;s right
                          </ActionButton>
                        )}
                        {isConfirmed && (
                          <span
                            style={{
                              fontSize: "0.78rem",
                              color: "#4ade80",
                              fontWeight: 600,
                            }}
                          >
                            ✓ Confirmed
                          </span>
                        )}
                        <ActionButton
                          onClick={() => handleStartEdit(fact.id)}
                          variant="ghost"
                        >
                          ✏ Edit
                        </ActionButton>
                        <ActionButton
                          onClick={() => handleDismiss(fact.id)}
                          variant="danger"
                        >
                          ✗
                        </ActionButton>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}

      {/* Bottom continue */}
      {canContinue && (
        <form action={advanceToPaywall} style={{ textAlign: "center" }}>
          <button
            type="submit"
            disabled={isPending}
            style={{
              padding: "0.875rem 2rem",
              borderRadius: "0.625rem",
              background: "var(--accent)",
              color: "#fff",
              fontWeight: 700,
              fontSize: "0.95rem",
              border: "none",
              cursor: "pointer",
            }}
          >
            Continue to paywall →
          </button>
        </form>
      )}
    </div>
  );
}

function ActionButton({
  children,
  onClick,
  variant,
}: {
  children: React.ReactNode;
  onClick: () => void;
  variant: "confirm" | "ghost" | "primary" | "danger";
}) {
  const styles: Record<typeof variant, React.CSSProperties> = {
    confirm: {
      padding: "0.35rem 0.875rem",
      borderRadius: "0.375rem",
      background: "rgba(74,222,128,0.12)",
      border: "1px solid rgba(74,222,128,0.25)",
      color: "#4ade80",
      fontSize: "0.8rem",
      fontWeight: 600,
      cursor: "pointer",
    },
    primary: {
      padding: "0.35rem 0.875rem",
      borderRadius: "0.375rem",
      background: "var(--accent)",
      border: "none",
      color: "#fff",
      fontSize: "0.8rem",
      fontWeight: 600,
      cursor: "pointer",
    },
    ghost: {
      padding: "0.35rem 0.875rem",
      borderRadius: "0.375rem",
      background: "rgba(255,255,255,0.06)",
      border: "1px solid rgba(255,255,255,0.12)",
      color: "var(--muted)",
      fontSize: "0.8rem",
      fontWeight: 600,
      cursor: "pointer",
    },
    danger: {
      padding: "0.35rem 0.75rem",
      borderRadius: "0.375rem",
      background: "rgba(248,113,113,0.08)",
      border: "1px solid rgba(248,113,113,0.2)",
      color: "#f87171",
      fontSize: "0.8rem",
      fontWeight: 600,
      cursor: "pointer",
    },
  };

  return (
    <button type="button" onClick={onClick} style={styles[variant]}>
      {children}
    </button>
  );
}
