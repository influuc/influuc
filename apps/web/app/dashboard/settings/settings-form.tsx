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
  { id: "manual",    label: "Manual",    description: "You review and approve every post individually. Nothing goes out without your explicit tap." },
  { id: "assisted",  label: "Automatic", description: "Approve your whole week with one click. Posts won't publish until you give the green light.", recommended: true },
  { id: "autopilot", label: "Autopilot", description: "Posts publish automatically on schedule. Zero clicks, zero friction — you set the limits." },
] as const;

export interface SettingsFormProps {
  initialMode: "manual" | "assisted" | "autopilot";
  initialFocusTopics: string[];
  initialContentGoals: string[];
  initialTone: string;
  initialProhibitedTopics: string[];
  initialExtraNotes: string;
  initialMaxPerDay: number;
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
            <span key={tag} className="tag-chip">
              {tag}
              <button type="button" onClick={() => setTags(tags.filter(x => x !== tag))} className="tag-chip-remove">×</button>
            </span>
          ))}
        </div>
      )}
      <div style={{ display: "flex", gap: "0.5rem" }}>
        <input value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
          placeholder={placeholder}
          className="input"
          style={{ flex: 1, padding: "10px 14px" }}
        />
        <button type="button" onClick={add} className="btn btn-xs btn-ghost" style={{ whiteSpace: "nowrap" }}>
          Add
        </button>
      </div>
    </div>
  );
}

export function SettingsForm({ initialMode, initialFocusTopics, initialContentGoals, initialTone, initialProhibitedTopics, initialExtraNotes, initialMaxPerDay }: SettingsFormProps) {
  const [mode, setMode] = useState<"manual" | "assisted" | "autopilot">(initialMode);
  const [autopilotAck, setAutopilotAck] = useState(initialMode === "autopilot");
  const [maxPerDay, setMaxPerDay] = useState(initialMaxPerDay);
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
      fd.set("max_autopilot_per_day", String(maxPerDay));
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
                className={`toggle-card ${active ? "toggle-card-active" : ""}`}
              >
                <div style={{
                  width: 14, height: 14, borderRadius: "50%", flexShrink: 0,
                  border: `2px solid ${active ? "var(--accent)" : "var(--muted-2)"}`,
                  background: active ? "var(--accent)" : "transparent",
                  transition: "border-color 0.15s, background 0.15s",
                }} />
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                    <span style={{ fontWeight: 600, fontSize: "0.875rem", color: "var(--fg)" }}>{m.label}</span>
                    {"recommended" in m && m.recommended && (
                      <span style={{ fontSize: "0.6rem", padding: "2px 7px", borderRadius: 4, background: "var(--accent-bg)", color: "var(--accent-fg)", fontWeight: 700, letterSpacing: "0.05em" }}>
                        RECOMMENDED
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: "0.775rem", color: "var(--muted)", margin: "2px 0 0" }}>{m.description}</p>
                </div>
              </button>
            );
          })}
          {mode === "autopilot" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
              {/* Daily cap */}
              <div style={{
                padding: "0.875rem 1rem", borderRadius: "var(--radius)",
                border: "1px solid var(--border)", background: "rgba(255,255,255,0.02)",
                display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem",
              }}>
                <div>
                  <p style={{ margin: 0, fontWeight: 600, fontSize: "0.85rem", color: "var(--fg)" }}>Daily post cap</p>
                  <p style={{ margin: "2px 0 0", fontSize: "0.72rem", color: "var(--muted)" }}>
                    Max posts autopilot can publish per day
                  </p>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexShrink: 0 }}>
                  <button type="button" onClick={() => setMaxPerDay(v => Math.max(1, v - 1))}
                    style={{ width: 28, height: 28, borderRadius: 7, border: "1px solid var(--border)", background: "rgba(255,255,255,0.05)", color: "var(--fg)", cursor: "pointer", fontSize: "1rem", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    −
                  </button>
                  <span style={{ fontSize: "1rem", fontWeight: 700, color: "var(--fg)", minWidth: 24, textAlign: "center" }}>
                    {maxPerDay}
                  </span>
                  <button type="button" onClick={() => setMaxPerDay(v => Math.min(10, v + 1))}
                    style={{ width: 28, height: 28, borderRadius: 7, border: "1px solid var(--border)", background: "rgba(255,255,255,0.05)", color: "var(--fg)", cursor: "pointer", fontSize: "1rem", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    +
                  </button>
                </div>
              </div>

              {/* Acknowledgment */}
              <label style={{
                display: "flex", gap: "0.75rem", padding: "0.875rem 1rem", borderRadius: "var(--radius)",
                border: "1px solid rgba(248,113,113,0.2)", background: "rgba(248,113,113,0.04)",
                cursor: "pointer", alignItems: "flex-start",
              }}>
                <input type="checkbox" checked={autopilotAck} onChange={e => setAutopilotAck(e.target.checked)}
                  style={{ marginTop: 2, accentColor: "var(--accent)", flexShrink: 0 }} />
                <span style={{ fontSize: "0.8rem", color: "var(--muted)", lineHeight: 1.6 }}>
                  I understand Influuc will publish up to {maxPerDay} post{maxPerDay !== 1 ? "s" : ""} per day automatically on my behalf. I can change this cap or switch modes at any time.
                </span>
              </label>
            </div>
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
              className={`pill-btn ${contentGoals.includes(g.id) ? "pill-btn-active" : ""}`}
            >
              {g.label}
            </button>
          ))}
        </div>
      </Section>

      <Section label="Tone">
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
          {TONE_OPTIONS.map(t => (
            <button key={t.id} type="button" onClick={() => setTone(t.id)}
              className={`pill-btn ${tone === t.id ? "pill-btn-active" : ""}`}
            >
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
          className="textarea"
        />
      </Section>

      <div style={{ display: "flex", alignItems: "center", gap: "0.875rem" }}>
        <button type="button" onClick={handleSave} disabled={isPending || !canSave}
          className="btn btn-primary btn-sm"
          style={{ opacity: !canSave || isPending ? 0.45 : 1 }}
        >
          {isPending ? "Saving…" : "Save changes"}
        </button>
        {saved && <span style={{ fontSize: "0.8rem", color: "var(--success)", fontWeight: 500 }}>✓ Saved</span>}
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
