"use client";

import { useState, useTransition } from "react";
import { updateSettings } from "./actions";

const GOAL_OPTIONS = [
  { id: "grow_audience",   label: "Grow audience"      },
  { id: "generate_leads",  label: "Generate leads"     },
  { id: "build_authority", label: "Build authority"    },
  { id: "share_knowledge", label: "Share knowledge"    },
  { id: "network",         label: "Network with peers" },
];

const TONE_OPTIONS = [
  { id: "direct",       label: "Direct"       },
  { id: "educational",  label: "Educational"  },
  { id: "storytelling", label: "Story-driven" },
  { id: "casual",       label: "Casual"       },
  { id: "professional", label: "Professional" },
];

const AUTONOMY_MODES = [
  { id: "manual",    label: "Manual",    description: "You review and approve every post before anything goes out." },
  { id: "assisted",  label: "Assisted",  description: "High-confidence posts queue for your approval. ~10 min/week.", recommended: true },
  { id: "autopilot", label: "Autopilot", description: "Posts publish automatically within daily caps you control." },
] as const;

export interface SettingsFormProps {
  initialMode: "manual" | "assisted" | "autopilot";
  initialFocusTopics: string[];
  initialContentGoals: string[];
  initialTone: string;
  initialProhibitedTopics: string[];
  initialExtraNotes: string;
}

function TagInput({ tags, setTags, placeholder }: { tags: string[]; setTags: (t: string[]) => void; placeholder: string }) {
  const [input, setInput] = useState("");
  function add() {
    const v = input.trim();
    if (v && !tags.includes(v)) setTags([...tags, v]);
    setInput("");
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
      {tags.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
          {tags.map(tag => (
            <span key={tag} style={{
              display: "flex", alignItems: "center", gap: "0.3rem",
              padding: "0.3rem 0.625rem", borderRadius: 999,
              background: "var(--accent-bg)", border: "1px solid rgba(109,107,245,0.2)",
              fontSize: "0.8rem", color: "var(--accent-fg)",
            }}>
              {tag}
              <button type="button" onClick={() => setTags(tags.filter(x => x !== tag))}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--accent-fg)", padding: 0, lineHeight: 1, fontSize: "0.85rem", fontFamily: "inherit" }}>
                ×
              </button>
            </span>
          ))}
        </div>
      )}
      <div style={{ display: "flex", gap: "0.5rem" }}>
        <input value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
          placeholder={placeholder}
          style={{
            flex: 1, padding: "0.625rem 0.875rem", borderRadius: "var(--radius-sm)",
            border: "1px solid var(--border-med)", background: "rgba(255,255,255,0.03)",
            color: "var(--fg)", fontSize: "0.875rem", outline: "none", fontFamily: "inherit",
          }}
        />
        <button type="button" onClick={add} style={{
          padding: "0.625rem 1rem", borderRadius: "var(--radius-sm)",
          background: "var(--accent-bg)", border: "1px solid rgba(109,107,245,0.2)",
          color: "var(--accent-fg)", fontSize: "0.8rem", fontWeight: 600,
          cursor: "pointer", whiteSpace: "nowrap", fontFamily: "inherit",
        }}>
          Add
        </button>
      </div>
    </div>
  );
}

export function SettingsForm({ initialMode, initialFocusTopics, initialContentGoals, initialTone, initialProhibitedTopics, initialExtraNotes }: SettingsFormProps) {
  const [mode, setMode] = useState<"manual" | "assisted" | "autopilot">(initialMode);
  const [autopilotAck, setAutopilotAck] = useState(initialMode === "autopilot");
  const [focusTopics, setFocusTopics] = useState(initialFocusTopics);
  const [contentGoals, setContentGoals] = useState(initialContentGoals);
  const [tone, setTone] = useState(initialTone || "direct");
  const [prohibitedTopics, setProhibitedTopics] = useState(initialProhibitedTopics);
  const [extraNotes, setExtraNotes] = useState(initialExtraNotes);
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    if (mode === "autopilot" && !autopilotAck) return;
    startTransition(async () => {
      const fd = new FormData();
      fd.set("mode", mode);
      fd.set("autopilot_ack", autopilotAck ? "on" : "off");
      focusTopics.forEach(t => fd.append("focus_topics", t));
      contentGoals.forEach(g => fd.append("content_goals", g));
      prohibitedTopics.forEach(t => fd.append("prohibited_topics", t));
      fd.set("tone", tone);
      fd.set("extra_notes", extraNotes);
      await updateSettings(fd);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    });
  }

  const pill = (active: boolean): React.CSSProperties => ({
    padding: "0.4rem 0.875rem", borderRadius: 999,
    border: `1px solid ${active ? "rgba(109,107,245,0.3)" : "var(--border-med)"}`,
    background: active ? "var(--accent-bg)" : "transparent",
    color: active ? "var(--accent-fg)" : "var(--muted)",
    fontSize: "0.82rem", fontWeight: active ? 600 : 400, cursor: "pointer",
    fontFamily: "inherit", transition: "background 0.1s, color 0.1s, border-color 0.1s",
  });

  const canSave = mode !== "autopilot" || autopilotAck;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>

      {/* Autonomy mode */}
      <Section label="Autonomy Mode">
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {AUTONOMY_MODES.map(m => {
            const active = mode === m.id;
            return (
              <button key={m.id} type="button"
                onClick={() => { setMode(m.id); if (m.id !== "autopilot") setAutopilotAck(false); }}
                style={{
                  display: "flex", gap: "0.875rem", padding: "0.875rem 1rem",
                  borderRadius: "var(--radius)", textAlign: "left", alignItems: "center",
                  border: `1px solid ${active ? "rgba(109,107,245,0.3)" : "var(--border)"}`,
                  background: active ? "var(--accent-bg)" : "rgba(255,255,255,0.02)",
                  cursor: "pointer", fontFamily: "inherit",
                }}>
                <div style={{
                  width: 14, height: 14, borderRadius: "50%", flexShrink: 0,
                  border: `2px solid ${active ? "var(--accent)" : "var(--muted-2)"}`,
                  background: active ? "var(--accent)" : "transparent",
                }} />
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                    <span style={{ fontWeight: 600, fontSize: "0.875rem", color: "var(--fg)" }}>{m.label}</span>
                    {"recommended" in m && m.recommended && (
                      <span style={{ fontSize: "0.6rem", padding: "0.1rem 0.45rem", borderRadius: 4, background: "var(--accent-bg)", color: "var(--accent-fg)", fontWeight: 700, letterSpacing: "0.05em" }}>
                        RECOMMENDED
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: "0.775rem", color: "var(--muted)", margin: "0.15rem 0 0" }}>{m.description}</p>
                </div>
              </button>
            );
          })}
          {mode === "autopilot" && (
            <label style={{
              display: "flex", gap: "0.75rem", padding: "0.875rem 1rem", borderRadius: "var(--radius)",
              border: "1px solid rgba(248,113,113,0.2)", background: "rgba(248,113,113,0.04)",
              cursor: "pointer", alignItems: "flex-start",
            }}>
              <input type="checkbox" checked={autopilotAck} onChange={e => setAutopilotAck(e.target.checked)}
                style={{ marginTop: 2, accentColor: "var(--accent)", flexShrink: 0 }} />
              <span style={{ fontSize: "0.8rem", color: "var(--muted)", lineHeight: 1.6 }}>
                I understand Influuc will publish posts automatically on my behalf. I can set a daily cap, undo any post, and switch modes at any time.
              </span>
            </label>
          )}
        </div>
      </Section>

      <Divider />

      <Section label="Focus Topics">
        <TagInput tags={focusTopics} setTags={setFocusTopics} placeholder="e.g. SaaS growth, B2B sales, fundraising…" />
      </Section>

      <Section label="Content Goals">
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
          {GOAL_OPTIONS.map(g => (
            <button key={g.id} type="button"
              onClick={() => setContentGoals(prev => prev.includes(g.id) ? prev.filter(x => x !== g.id) : [...prev, g.id])}
              style={pill(contentGoals.includes(g.id))}>
              {g.label}
            </button>
          ))}
        </div>
      </Section>

      <Section label="Tone">
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
          {TONE_OPTIONS.map(t => (
            <button key={t.id} type="button" onClick={() => setTone(t.id)} style={pill(tone === t.id)}>
              {t.label}
            </button>
          ))}
        </div>
      </Section>

      <Section label="Topics to Avoid">
        <TagInput tags={prohibitedTopics} setTags={setProhibitedTopics} placeholder="e.g. politics, crypto, competitors…" />
      </Section>

      <Section label="Extra Notes">
        <textarea value={extraNotes} onChange={e => setExtraNotes(e.target.value)} rows={3}
          placeholder="Posting schedule, formatting rules, hard constraints. Optional."
          style={{
            width: "100%", padding: "0.75rem 0.875rem", borderRadius: "var(--radius-sm)",
            border: "1px solid var(--border-med)", background: "rgba(255,255,255,0.03)",
            color: "var(--fg)", fontSize: "0.875rem", resize: "vertical", outline: "none",
            lineHeight: 1.6, boxSizing: "border-box", fontFamily: "inherit",
          }}
        />
      </Section>

      <div style={{ display: "flex", alignItems: "center", gap: "0.875rem" }}>
        <button type="button" onClick={handleSave} disabled={isPending || !canSave} style={{
          padding: "0.625rem 1.5rem", borderRadius: "var(--radius-sm)",
          background: canSave && !isPending ? "var(--accent)" : "rgba(255,255,255,0.06)",
          color: canSave && !isPending ? "#fff" : "var(--muted)",
          fontWeight: 600, fontSize: "0.875rem", border: "none",
          cursor: canSave && !isPending ? "pointer" : "default",
          fontFamily: "inherit",
        }}>
          {isPending ? "Saving…" : "Save changes"}
        </button>
        {saved && <span style={{ fontSize: "0.8rem", color: "var(--success)" }}>Saved</span>}
      </div>
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      <p style={{ fontSize: "0.7rem", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--muted)", margin: 0 }}>
        {label}
      </p>
      {children}
    </div>
  );
}

function Divider() {
  return <div style={{ height: 1, background: "var(--border)" }} />;
}
