"use client";

import { useState, useTransition } from "react";
import { promoteFact, dismissFact, addFact } from "./actions";

type BrainLayer = "identity" | "expertise" | "offer" | "audience" | "positioning" | "belief" | "story" | "writing_style" | "goal";

const LAYER_OPTIONS: { value: BrainLayer; label: string }[] = [
  { value: "identity", label: "Identity" },
  { value: "expertise", label: "Expertise" },
  { value: "positioning", label: "Positioning" },
  { value: "audience", label: "Audience" },
  { value: "belief", label: "Beliefs" },
  { value: "goal", label: "Goals" },
  { value: "story", label: "Story" },
  { value: "writing_style", label: "Writing Style" },
  { value: "offer", label: "Offer" },
];

export function FactActions({ factId, type }: { factId: string; type: "candidate" | "active" }) {
  const [pending, startTransition] = useTransition();

  if (type === "candidate") {
    return (
      <div style={{ display: "flex", gap: "0.375rem", flexShrink: 0, alignSelf: "flex-start" }}>
        <button
          disabled={pending}
          onClick={() => startTransition(() => promoteFact(factId))}
          style={{
            padding: "3px 10px",
            fontSize: "0.7rem",
            fontWeight: 600,
            borderRadius: 6,
            border: "1px solid rgba(74,222,128,0.3)",
            background: "rgba(74,222,128,0.1)",
            color: "var(--success)",
            cursor: "pointer",
            opacity: pending ? 0.5 : 1,
          }}
        >
          Confirm
        </button>
        <button
          disabled={pending}
          onClick={() => startTransition(() => dismissFact(factId))}
          style={{
            padding: "3px 10px",
            fontSize: "0.7rem",
            fontWeight: 600,
            borderRadius: 6,
            border: "1px solid var(--border)",
            background: "transparent",
            color: "var(--muted-2)",
            cursor: "pointer",
            opacity: pending ? 0.5 : 1,
          }}
        >
          Dismiss
        </button>
      </div>
    );
  }

  return (
    <button
      disabled={pending}
      onClick={() => startTransition(() => dismissFact(factId))}
      title="Remove fact"
      style={{
        padding: "3px 8px",
        fontSize: "0.68rem",
        borderRadius: 6,
        border: "1px solid var(--border)",
        background: "transparent",
        color: "var(--muted-2)",
        cursor: "pointer",
        flexShrink: 0,
        alignSelf: "flex-start",
        opacity: pending ? 0.5 : 1,
      }}
    >
      ✕
    </button>
  );
}

export function AddFactForm() {
  const [open, setOpen] = useState(false);
  const [layer, setLayer] = useState<BrainLayer>("expertise");
  const [content, setContent] = useState("");
  const [pending, startTransition] = useTransition();

  function submit() {
    if (!content.trim()) return;
    startTransition(async () => {
      await addFact(layer, content.trim());
      setContent("");
      setOpen(false);
    });
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          padding: "0.6rem 1rem",
          borderRadius: "var(--radius-sm)",
          border: "1px dashed var(--border-med)",
          background: "transparent",
          color: "var(--muted)",
          fontSize: "0.8rem",
          cursor: "pointer",
          width: "100%",
          marginTop: "0.5rem",
        }}
      >
        <span style={{ fontSize: "1rem", lineHeight: 1 }}>+</span>
        Add a brain fact manually
      </button>
    );
  }

  return (
    <div style={{
      padding: "1.25rem",
      background: "var(--card)",
      border: "1px solid var(--border-med)",
      borderRadius: "var(--radius)",
      display: "flex",
      flexDirection: "column",
      gap: "0.875rem",
      marginTop: "0.5rem",
    }}>
      <p style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--muted)", margin: 0, textTransform: "uppercase", letterSpacing: "0.06em" }}>
        Add Brain Fact
      </p>

      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
        <select
          value={layer}
          onChange={e => setLayer(e.target.value as BrainLayer)}
          style={{
            padding: "0.45rem 0.75rem",
            borderRadius: 8,
            border: "1px solid var(--border-med)",
            background: "var(--input-bg, rgba(255,255,255,0.05))",
            color: "var(--fg)",
            fontSize: "0.82rem",
            cursor: "pointer",
            flexShrink: 0,
          }}
        >
          {LAYER_OPTIONS.map(l => (
            <option key={l.value} value={l.value}>{l.label}</option>
          ))}
        </select>

        <textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder="Describe the fact in 1–2 sentences..."
          rows={2}
          style={{
            flex: 1,
            minWidth: 200,
            padding: "0.5rem 0.75rem",
            borderRadius: 8,
            border: "1px solid var(--border-med)",
            background: "var(--input-bg, rgba(255,255,255,0.05))",
            color: "var(--fg)",
            fontSize: "0.82rem",
            resize: "vertical",
            fontFamily: "inherit",
          }}
        />
      </div>

      <div style={{ display: "flex", gap: "0.5rem" }}>
        <button
          disabled={pending || !content.trim()}
          onClick={submit}
          style={{
            padding: "0.45rem 1rem",
            borderRadius: 8,
            border: "1px solid rgba(109,107,245,0.4)",
            background: "rgba(109,107,245,0.15)",
            color: "var(--accent-fg)",
            fontSize: "0.8rem",
            fontWeight: 600,
            cursor: "pointer",
            opacity: pending || !content.trim() ? 0.5 : 1,
          }}
        >
          {pending ? "Adding…" : "Add fact"}
        </button>
        <button
          onClick={() => { setOpen(false); setContent(""); }}
          style={{
            padding: "0.45rem 0.875rem",
            borderRadius: 8,
            border: "1px solid var(--border)",
            background: "transparent",
            color: "var(--muted)",
            fontSize: "0.8rem",
            cursor: "pointer",
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
