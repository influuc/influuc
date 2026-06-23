"use client";

import { useState } from "react";
import { savePreferences } from "./actions";

const GOAL_OPTIONS = [
  { id: "grow_audience", label: "Grow my audience" },
  { id: "generate_leads", label: "Generate leads / clients" },
  { id: "build_authority", label: "Build authority in my niche" },
  { id: "share_knowledge", label: "Share knowledge & insights" },
  { id: "network", label: "Network with peers & investors" },
];

const TONE_OPTIONS = [
  { id: "direct", label: "Direct & no-fluff" },
  { id: "educational", label: "Educational & clear" },
  { id: "storytelling", label: "Story-driven" },
  { id: "casual", label: "Casual & conversational" },
  { id: "professional", label: "Professional & polished" },
];

const AUTONOMY_MODES = [
  {
    id: "manual",
    label: "Manual",
    description: "You review and approve every post before anything goes out.",
  },
  {
    id: "assisted",
    label: "Assisted",
    description: "High-confidence posts queue for your approval. ~10 min/week.",
    recommended: true,
  },
  {
    id: "autopilot",
    label: "Autopilot",
    description: "Approved-quality posts publish automatically within daily caps you control.",
  },
] as const;

function TagInput({
  name,
  placeholder,
}: {
  name: string;
  placeholder: string;
}) {
  const [tags, setTags] = useState<string[]>([]);
  const [input, setInput] = useState("");

  function add() {
    const val = input.trim();
    if (val && !tags.includes(val)) setTags((t) => [...t, val]);
    setInput("");
  }

  function remove(tag: string) {
    setTags((t) => t.filter((x) => x !== tag));
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
      {tags.map((tag) => (
        <input key={tag} type="hidden" name={name} value={tag} />
      ))}
      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
        {tags.map((tag) => (
          <span
            key={tag}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.35rem",
              padding: "0.25rem 0.625rem",
              borderRadius: "2rem",
              background: "rgba(109,107,245,0.15)",
              border: "1px solid rgba(109,107,245,0.3)",
              fontSize: "0.8rem",
              color: "#a5b4fc",
            }}
          >
            {tag}
            <button
              type="button"
              onClick={() => remove(tag)}
              style={{ background: "none", border: "none", cursor: "pointer", color: "#a5b4fc", padding: 0, lineHeight: 1 }}
            >
              ×
            </button>
          </span>
        ))}
      </div>
      <div style={{ display: "flex", gap: "0.5rem" }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
          placeholder={placeholder}
          style={{
            flex: 1,
            padding: "0.6rem 0.875rem",
            borderRadius: "0.5rem",
            border: "1px solid rgba(255,255,255,0.12)",
            background: "rgba(255,255,255,0.04)",
            color: "var(--foreground)",
            fontSize: "0.875rem",
            outline: "none",
          }}
        />
        <button
          type="button"
          onClick={add}
          style={{
            padding: "0.6rem 1rem",
            borderRadius: "0.5rem",
            background: "rgba(109,107,245,0.15)",
            border: "1px solid rgba(109,107,245,0.3)",
            color: "#a5b4fc",
            fontSize: "0.8rem",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Add
        </button>
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontSize: "0.72rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--muted)", fontWeight: 700, margin: 0 }}>
      {children}
    </p>
  );
}

export function PreferencesForm() {
  const [selectedGoals, setSelectedGoals] = useState<string[]>(["build_authority"]);
  const [selectedTone, setSelectedTone] = useState<string>("direct");
  const [mode, setMode] = useState<"manual" | "assisted" | "autopilot">("assisted");
  const [autopilotAck, setAutopilotAck] = useState(false);
  const [isPending, setIsPending] = useState(false);

  function toggleGoal(id: string) {
    setSelectedGoals((prev) =>
      prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id]
    );
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (mode === "autopilot" && !autopilotAck) return;
    setIsPending(true);
    const fd = new FormData(e.currentTarget);
    await savePreferences(fd);
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{ width: "100%", maxWidth: "520px", display: "flex", flexDirection: "column", gap: "2rem" }}
    >
      <input type="hidden" name="mode" value={mode} />
      {selectedGoals.map((g) => <input key={g} type="hidden" name="content_goals" value={g} />)}
      <input type="hidden" name="tone" value={selectedTone} />

      {/* Q1 — Topics to focus on */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        <SectionLabel>What topics do you want to post about?</SectionLabel>
        <TagInput name="focus_topics" placeholder="e.g. SaaS growth, B2B sales, fundraising…" />
      </div>

      {/* Q2 — Goals */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        <SectionLabel>What are your content goals? (pick all that apply)</SectionLabel>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
          {GOAL_OPTIONS.map((g) => {
            const active = selectedGoals.includes(g.id);
            return (
              <button
                key={g.id}
                type="button"
                onClick={() => toggleGoal(g.id)}
                style={{
                  padding: "0.4rem 0.875rem",
                  borderRadius: "2rem",
                  border: active ? "1px solid rgba(109,107,245,0.5)" : "1px solid rgba(255,255,255,0.12)",
                  background: active ? "rgba(109,107,245,0.15)" : "rgba(255,255,255,0.04)",
                  color: active ? "#a5b4fc" : "var(--muted)",
                  fontSize: "0.82rem",
                  fontWeight: active ? 600 : 400,
                  cursor: "pointer",
                }}
              >
                {g.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Q3 — Tone */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        <SectionLabel>What best describes your posting style?</SectionLabel>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
          {TONE_OPTIONS.map((t) => {
            const active = selectedTone === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setSelectedTone(t.id)}
                style={{
                  padding: "0.4rem 0.875rem",
                  borderRadius: "2rem",
                  border: active ? "1px solid rgba(109,107,245,0.5)" : "1px solid rgba(255,255,255,0.12)",
                  background: active ? "rgba(109,107,245,0.15)" : "rgba(255,255,255,0.04)",
                  color: active ? "#a5b4fc" : "var(--muted)",
                  fontSize: "0.82rem",
                  fontWeight: active ? 600 : 400,
                  cursor: "pointer",
                }}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Q4 — Topics to avoid */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        <SectionLabel>Anything to avoid? (optional)</SectionLabel>
        <TagInput name="prohibited_topics" placeholder="e.g. politics, crypto, competitors…" />
      </div>

      {/* Q5 — Extra notes */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        <SectionLabel>Anything else Influuc should know? (optional)</SectionLabel>
        <textarea
          name="extra_notes"
          rows={3}
          placeholder="e.g. I only want to post Monday–Friday. Never use hashtags. Keep LinkedIn posts under 1500 chars."
          style={{
            padding: "0.75rem 0.875rem",
            borderRadius: "0.5rem",
            border: "1px solid rgba(255,255,255,0.12)",
            background: "rgba(255,255,255,0.04)",
            color: "var(--foreground)",
            fontSize: "0.875rem",
            resize: "vertical",
            outline: "none",
            lineHeight: 1.6,
          }}
        />
      </div>

      {/* Q6 — Autonomy mode */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        <SectionLabel>How much control do you want?</SectionLabel>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {AUTONOMY_MODES.map((m) => {
            const active = mode === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setMode(m.id)}
                style={{
                  display: "flex",
                  gap: "0.875rem",
                  padding: "0.875rem 1rem",
                  borderRadius: "0.625rem",
                  border: `1px solid ${active ? "rgba(109,107,245,0.5)" : "rgba(255,255,255,0.1)"}`,
                  background: active ? "rgba(109,107,245,0.08)" : "rgba(255,255,255,0.02)",
                  cursor: "pointer",
                  textAlign: "left",
                  alignItems: "center",
                }}
              >
                <div
                  style={{
                    width: 16, height: 16, borderRadius: "50%", flexShrink: 0,
                    border: `2px solid ${active ? "var(--accent)" : "rgba(255,255,255,0.25)"}`,
                    background: active ? "var(--accent)" : "transparent",
                  }}
                />
                <div style={{ display: "flex", flexDirection: "column", gap: "0.1rem" }}>
                  <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                    <span style={{ fontWeight: 600, fontSize: "0.9rem" }}>{m.label}</span>
                    {"recommended" in m && m.recommended && (
                      <span style={{
                        fontSize: "0.6rem", padding: "0.1rem 0.4rem", borderRadius: "0.25rem",
                        background: "rgba(109,107,245,0.2)", color: "var(--accent)", fontWeight: 700, letterSpacing: "0.05em",
                      }}>
                        RECOMMENDED
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: "0.8rem", color: "var(--muted)", margin: 0 }}>{m.description}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Autopilot ack */}
      {mode === "autopilot" && (
        <label style={{
          display: "flex", gap: "0.75rem", padding: "0.875rem 1rem", borderRadius: "0.625rem",
          border: "1px solid rgba(248,113,113,0.2)", background: "rgba(248,113,113,0.04)",
          cursor: "pointer", textAlign: "left", alignItems: "flex-start",
        }}>
          <input
            type="checkbox"
            name="autopilot_ack"
            checked={autopilotAck}
            onChange={(e) => setAutopilotAck(e.target.checked)}
            style={{ marginTop: 2, accentColor: "var(--accent)", flexShrink: 0 }}
          />
          <span style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.75)", lineHeight: 1.55 }}>
            I understand Influuc will publish posts automatically on my behalf. I can set a daily cap, undo any post, and switch modes at any time.
          </span>
        </label>
      )}

      <button
        type="submit"
        disabled={isPending || (mode === "autopilot" && !autopilotAck)}
        style={{
          padding: "0.9rem 1.5rem",
          borderRadius: "0.625rem",
          background: isPending || (mode === "autopilot" && !autopilotAck) ? "rgba(255,255,255,0.08)" : "var(--accent)",
          color: isPending || (mode === "autopilot" && !autopilotAck) ? "var(--muted)" : "#fff",
          fontWeight: 700,
          fontSize: "0.95rem",
          border: "none",
          cursor: isPending || (mode === "autopilot" && !autopilotAck) ? "default" : "pointer",
          transition: "background 0.2s",
        }}
      >
        {isPending ? "Generating your first week…" : "Generate my first week of content →"}
      </button>

      <p style={{ fontSize: "0.75rem", color: "var(--muted)", textAlign: "center", margin: 0 }}>
        Your first 21 X posts and 7 LinkedIn posts will be ready in ~60 seconds.
      </p>
    </form>
  );
}
