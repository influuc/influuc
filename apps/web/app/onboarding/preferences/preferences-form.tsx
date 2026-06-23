"use client";

import { useState } from "react";
import { savePreferences } from "./actions";

const MODES = [
  {
    id: "manual",
    label: "Manual",
    description:
      "Influuc finds opportunities and drafts posts. You review, edit, and publish every piece yourself.",
    icon: "🖊",
  },
  {
    id: "assisted",
    label: "Assisted",
    description:
      "Influuc queues high-confidence drafts for your approval. You spend ~10 min/week reviewing.",
    icon: "⚡",
    recommended: true,
  },
  {
    id: "autopilot",
    label: "Autopilot",
    description:
      "Influuc publishes approved-quality content automatically, within daily caps you control.",
    icon: "🚀",
  },
] as const;

export function PreferencesForm() {
  const [selected, setSelected] = useState<"manual" | "assisted" | "autopilot">("assisted");
  const [autopilotAck, setAutopilotAck] = useState(false);
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (selected === "autopilot" && !autopilotAck) return;
    setIsPending(true);
    const fd = new FormData(e.currentTarget);
    await savePreferences(fd);
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        width: "100%",
        maxWidth: "440px",
        display: "flex",
        flexDirection: "column",
        gap: "1rem",
      }}
    >
      <input type="hidden" name="mode" value={selected} />

      {MODES.map((mode) => {
        const isSelected = selected === mode.id;
        return (
          <button
            key={mode.id}
            type="button"
            onClick={() => setSelected(mode.id)}
            style={{
              display: "flex",
              gap: "1rem",
              padding: "1rem 1.25rem",
              borderRadius: "0.75rem",
              border: `1px solid ${isSelected ? "rgba(109,107,245,0.5)" : "rgba(255,255,255,0.1)"}`,
              background: isSelected ? "rgba(109,107,245,0.08)" : "rgba(255,255,255,0.02)",
              cursor: "pointer",
              textAlign: "left",
              alignItems: "flex-start",
              transition: "border-color 0.15s, background 0.15s",
            }}
          >
            <span style={{ fontSize: "1.4rem", flexShrink: 0 }}>{mode.icon}</span>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
              <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                <span style={{ fontWeight: 700, fontSize: "0.95rem" }}>{mode.label}</span>
                {"recommended" in mode && mode.recommended && (
                  <span
                    style={{
                      fontSize: "0.65rem",
                      padding: "0.15rem 0.5rem",
                      borderRadius: "0.25rem",
                      background: "rgba(109,107,245,0.2)",
                      color: "var(--accent)",
                      fontWeight: 700,
                      letterSpacing: "0.05em",
                    }}
                  >
                    RECOMMENDED
                  </span>
                )}
              </div>
              <p style={{ fontSize: "0.82rem", color: "var(--muted)", margin: 0, lineHeight: 1.55 }}>
                {mode.description}
              </p>
            </div>
          </button>
        );
      })}

      {/* Autopilot acknowledgement */}
      {selected === "autopilot" && (
        <label
          style={{
            display: "flex",
            gap: "0.75rem",
            padding: "1rem 1.25rem",
            borderRadius: "0.625rem",
            border: "1px solid rgba(248,113,113,0.2)",
            background: "rgba(248,113,113,0.04)",
            cursor: "pointer",
            textAlign: "left",
            alignItems: "flex-start",
          }}
        >
          <input
            type="checkbox"
            name="autopilot_ack"
            checked={autopilotAck}
            onChange={(e) => setAutopilotAck(e.target.checked)}
            style={{ marginTop: "2px", accentColor: "var(--accent)", flexShrink: 0 }}
          />
          <span style={{ fontSize: "0.82rem", color: "rgba(255,255,255,0.75)", lineHeight: 1.55 }}>
            I understand that Influuc will publish posts automatically on my behalf. I can set a
            daily cap, undo any post, and switch modes at any time from settings.
          </span>
        </label>
      )}

      <button
        type="submit"
        disabled={isPending || (selected === "autopilot" && !autopilotAck)}
        style={{
          padding: "0.9rem 1.5rem",
          borderRadius: "0.625rem",
          background:
            isPending || (selected === "autopilot" && !autopilotAck)
              ? "rgba(255,255,255,0.08)"
              : "var(--accent)",
          color:
            isPending || (selected === "autopilot" && !autopilotAck)
              ? "var(--muted)"
              : "#fff",
          fontWeight: 700,
          fontSize: "0.95rem",
          border: "none",
          cursor:
            isPending || (selected === "autopilot" && !autopilotAck)
              ? "default"
              : "pointer",
          transition: "background 0.2s",
        }}
      >
        {isPending ? "Saving…" : "Go to dashboard →"}
      </button>
    </form>
  );
}
