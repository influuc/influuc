"use client";

import { useState, useTransition } from "react";
import { confirmFact, editFact, dismissFact, confirmAllFacts, advanceToPaywall } from "./actions";

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

type FS = { status: string; content: string; editing: boolean; draft: string };

export function SummaryClient({
  grouped, layerOrder, layerLabels, initialConfirmedCount,
}: SummaryClientProps) {
  const [confirmedCount, setConfirmedCount] = useState(initialConfirmedCount);
  const [isPending, startTransition] = useTransition();
  const [activeLayer, setActiveLayer] = useState<string>("all");
  const [factStates, setFactStates] = useState<Record<string, FS>>(() => {
    const init: Record<string, FS> = {};
    for (const layer of layerOrder) {
      for (const fact of grouped[layer] ?? []) {
        init[fact.id] = { status: fact.status, content: fact.content, editing: false, draft: fact.content };
      }
    }
    return init;
  });

  function patchFact(id: string, patch: Partial<FS>) {
    setFactStates((s) => {
      const prev = s[id];
      if (!prev) return s;
      return { ...s, [id]: { ...prev, ...patch } };
    });
  }

  function handleConfirm(factId: string) {
    const current = factStates[factId];
    if (!current || current.status === "active") return;
    patchFact(factId, { status: "active" });
    setConfirmedCount((c) => c + 1);
    startTransition(() => confirmFact(factId));
  }

  function handleAcceptAll() {
    const newStates = { ...factStates };
    let added = 0;
    for (const id of Object.keys(newStates)) {
      const s = newStates[id]!;
      if (s.status !== "active" && s.status !== "rejected") {
        newStates[id] = { ...s, status: "active" };
        added++;
      }
    }
    setFactStates(newStates);
    setConfirmedCount((c) => c + added);
    startTransition(() => confirmAllFacts());
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

  const activeLayers = layerOrder.filter(
    (l) => (grouped[l] ?? []).some((f) => factStates[f.id]?.status !== "rejected")
  );

  const totalFacts = Object.values(factStates).filter((s) => s.status !== "rejected").length;
  const allConfirmed = confirmedCount >= totalFacts && totalFacts > 0;
  const canContinue = confirmedCount > 0;

  const layersToRender = activeLayer === "all" ? activeLayers : activeLayers.filter((l) => l === activeLayer);

  return (
    <div style={{ width: "100%", maxWidth: 700, display: "flex", flexDirection: "column", gap: "1.5rem" }}>

      {/* Top bar */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: "0.75rem",
        padding: "14px 18px",
        borderRadius: 12,
        background: "rgba(109,107,245,0.07)",
        border: "1px solid rgba(109,107,245,0.2)",
        flexWrap: "wrap",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 120 }}>
          <div className="glow-dot glow-dot-accent" />
          <span style={{ fontSize: "0.875rem", fontWeight: 600 }}>
            {confirmedCount} / {totalFacts} facts confirmed
          </span>
        </div>
        {!allConfirmed && totalFacts > 0 && (
          <button
            onClick={handleAcceptAll}
            disabled={isPending}
            className="btn btn-xs btn-ghost"
          >
            ✓ Accept all
          </button>
        )}
        {canContinue && (
          <form action={advanceToPaywall}>
            <button type="submit" disabled={isPending} className="btn btn-xs btn-primary">
              Continue →
            </button>
          </form>
        )}
      </div>

      {/* Layer tabs */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        <button
          onClick={() => setActiveLayer("all")}
          className={`tab-btn ${activeLayer === "all" ? "tab-btn-active" : ""}`}
        >
          All
        </button>
        {activeLayers.map((l) => (
          <button
            key={l}
            onClick={() => setActiveLayer(l)}
            className={`tab-btn ${activeLayer === l ? "tab-btn-active" : ""}`}
          >
            {layerLabels[l] ?? l}
          </button>
        ))}
      </div>

      {/* Facts */}
      {layersToRender.map((layer) => {
        const facts = (grouped[layer] ?? []).filter(
          (f) => factStates[f.id]?.status !== "rejected"
        );
        if (facts.length === 0) return null;
        return (
          <div key={layer} style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
            {activeLayer === "all" && (
              <p style={{
                fontSize: "0.7rem", letterSpacing: "0.12em", textTransform: "uppercase",
                color: "rgba(255,255,255,0.3)", fontWeight: 700, margin: 0, paddingLeft: 2,
              }}>
                {layerLabels[layer] ?? layer}
              </p>
            )}
            {facts.map((fact) => {
              const state = factStates[fact.id];
              if (!state) return null;
              const isConfirmed = state.status === "active";
              const isEditing = state.editing;
              return (
                <div key={fact.id} style={{
                  padding: "14px 18px",
                  borderRadius: 12,
                  border: `1px solid ${isConfirmed ? "rgba(74,222,128,0.2)" : "rgba(255,255,255,0.07)"}`,
                  background: isConfirmed ? "rgba(74,222,128,0.04)" : "rgba(255,255,255,0.025)",
                  display: "flex", flexDirection: "column", gap: "0.625rem",
                  transition: "border-color 0.15s, background 0.15s",
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "0.68rem", color: "rgba(255,255,255,0.25)" }}>
                      {Math.round((fact.confidence ?? 0.5) * 100)}% confidence
                    </span>
                    {isConfirmed && (
                      <span style={{ fontSize: "0.72rem", color: "#4ade80", fontWeight: 600 }}>✓ Confirmed</span>
                    )}
                  </div>

                  {isEditing ? (
                    <textarea
                      value={state.draft}
                      onChange={(e) => patchFact(fact.id, { draft: e.target.value })}
                      rows={3}
                      autoFocus
                      className="textarea"
                      style={{ borderColor: "rgba(109,107,245,0.4)", background: "rgba(109,107,245,0.05)" }}
                    />
                  ) : (
                    <p style={{
                      fontSize: "0.9rem", lineHeight: 1.65, margin: 0,
                      color: isConfirmed ? "#f4f4f5" : "rgba(255,255,255,0.7)",
                    }}>
                      {state.content}
                    </p>
                  )}

                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {isEditing ? (
                      <>
                        <button className="fact-action-btn fact-primary-btn" onClick={() => handleSaveEdit(fact.id)}>Save</button>
                        <button className="fact-action-btn fact-ghost-btn" onClick={() => patchFact(fact.id, { editing: false })}>Cancel</button>
                      </>
                    ) : (
                      <>
                        {!isConfirmed && (
                          <button className="fact-action-btn fact-confirm-btn" onClick={() => handleConfirm(fact.id)}>✓ That&apos;s right</button>
                        )}
                        <button className="fact-action-btn fact-ghost-btn" onClick={() => handleStartEdit(fact.id)}>✏ Edit</button>
                        <button className="fact-action-btn fact-danger-btn" onClick={() => handleDismiss(fact.id)}>✗</button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}

      {canContinue && (
        <form action={advanceToPaywall} style={{ textAlign: "center", paddingBottom: "2rem" }}>
          <button type="submit" disabled={isPending} className="btn btn-primary" style={{ padding: "13px 32px", fontSize: "0.95rem" }}>
            Continue →
          </button>
        </form>
      )}
    </div>
  );
}
