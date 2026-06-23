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

const STEPS = [
  "topics",
  "goals",
  "tone",
  "avoid",
  "notes",
  "mode",
] as const;
type Step = typeof STEPS[number];

function TagInput({
  tags,
  setTags,
  placeholder,
}: {
  tags: string[];
  setTags: (tags: string[]) => void;
  placeholder: string;
}) {
  const [input, setInput] = useState("");

  function add() {
    const val = input.trim();
    if (val && !tags.includes(val)) setTags([...tags, val]);
    setInput("");
  }

  function remove(tag: string) {
    setTags(tags.filter((x) => x !== tag));
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", width: "100%" }}>
      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", minHeight: tags.length ? "auto" : 0 }}>
        {tags.map((tag) => (
          <span
            key={tag}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.35rem",
              padding: "0.35rem 0.75rem",
              borderRadius: "2rem",
              background: "rgba(109,107,245,0.15)",
              border: "1px solid rgba(109,107,245,0.35)",
              fontSize: "0.875rem",
              color: "#a5b4fc",
            }}
          >
            {tag}
            <button
              type="button"
              onClick={() => remove(tag)}
              style={{ background: "none", border: "none", cursor: "pointer", color: "#a5b4fc", padding: 0, lineHeight: 1, fontSize: "1rem" }}
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
            padding: "0.75rem 1rem",
            borderRadius: "0.5rem",
            border: "1px solid rgba(255,255,255,0.12)",
            background: "rgba(255,255,255,0.04)",
            color: "var(--foreground)",
            fontSize: "0.95rem",
            outline: "none",
          }}
        />
        <button
          type="button"
          onClick={add}
          style={{
            padding: "0.75rem 1.25rem",
            borderRadius: "0.5rem",
            background: "rgba(109,107,245,0.2)",
            border: "1px solid rgba(109,107,245,0.4)",
            color: "#a5b4fc",
            fontSize: "0.875rem",
            fontWeight: 600,
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}
        >
          Add
        </button>
      </div>
    </div>
  );
}

export function PreferencesForm() {
  const [step, setStep] = useState(0);
  const [focusTopics, setFocusTopics] = useState<string[]>([]);
  const [selectedGoals, setSelectedGoals] = useState<string[]>(["build_authority"]);
  const [selectedTone, setSelectedTone] = useState<string>("direct");
  const [prohibitedTopics, setProhibitedTopics] = useState<string[]>([]);
  const [extraNotes, setExtraNotes] = useState("");
  const [mode, setMode] = useState<"manual" | "assisted" | "autopilot">("assisted");
  const [autopilotAck, setAutopilotAck] = useState(false);
  const [isPending, setIsPending] = useState(false);

  const currentStep = STEPS[step];
  const isLast = step === STEPS.length - 1;
  const canSubmit = isLast && (mode !== "autopilot" || autopilotAck);

  function toggleGoal(id: string) {
    setSelectedGoals((prev) =>
      prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id]
    );
  }

  function canAdvance() {
    if (currentStep === "topics") return focusTopics.length > 0;
    if (currentStep === "goals") return selectedGoals.length > 0;
    return true;
  }

  async function handleSubmit() {
    if (mode === "autopilot" && !autopilotAck) return;
    setIsPending(true);
    const fd = new FormData();
    fd.set("mode", mode);
    fd.set("autopilot_ack", autopilotAck ? "on" : "off");
    focusTopics.forEach((t) => fd.append("focus_topics", t));
    selectedGoals.forEach((g) => fd.append("content_goals", g));
    prohibitedTopics.forEach((t) => fd.append("prohibited_topics", t));
    fd.set("tone", selectedTone);
    fd.set("extra_notes", extraNotes);
    await savePreferences(fd);
  }

  const pill = (active: boolean) => ({
    padding: "0.5rem 1rem",
    borderRadius: "2rem",
    border: active ? "1px solid rgba(109,107,245,0.6)" : "1px solid rgba(255,255,255,0.12)",
    background: active ? "rgba(109,107,245,0.18)" : "rgba(255,255,255,0.04)",
    color: active ? "#a5b4fc" : "var(--muted)",
    fontSize: "0.9rem",
    fontWeight: active ? 600 : 400,
    cursor: "pointer",
  } as React.CSSProperties);

  return (
    <div style={{ width: "100%", maxWidth: "560px", display: "flex", flexDirection: "column", gap: "2.5rem" }}>

      {/* Progress dots */}
      <div style={{ display: "flex", gap: "0.4rem", justifyContent: "center" }}>
        {STEPS.map((_, i) => (
          <div
            key={i}
            style={{
              width: i === step ? 20 : 6,
              height: 6,
              borderRadius: 3,
              background: i < step ? "var(--accent)" : i === step ? "var(--accent)" : "rgba(255,255,255,0.15)",
              transition: "width 0.2s, background 0.2s",
            }}
          />
        ))}
      </div>

      {/* Step content */}
      <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", alignItems: "center", textAlign: "center" }}>

        {currentStep === "topics" && (
          <>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
              <h2 style={{ fontSize: "clamp(1.25rem, 3vw, 1.75rem)", fontWeight: 700, margin: 0 }}>
                What topics do you want to post about?
              </h2>
              <p style={{ color: "var(--muted)", fontSize: "0.9rem", margin: 0 }}>
                Add the subjects that define your expertise and brand.
              </p>
            </div>
            <TagInput
              tags={focusTopics}
              setTags={setFocusTopics}
              placeholder="e.g. SaaS growth, B2B sales, fundraising…"
            />
          </>
        )}

        {currentStep === "goals" && (
          <>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
              <h2 style={{ fontSize: "clamp(1.25rem, 3vw, 1.75rem)", fontWeight: 700, margin: 0 }}>
                What are your content goals?
              </h2>
              <p style={{ color: "var(--muted)", fontSize: "0.9rem", margin: 0 }}>
                Pick all that apply — we&apos;ll weight your strategy accordingly.
              </p>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.6rem", justifyContent: "center" }}>
              {GOAL_OPTIONS.map((g) => (
                <button key={g.id} type="button" onClick={() => toggleGoal(g.id)} style={pill(selectedGoals.includes(g.id))}>
                  {g.label}
                </button>
              ))}
            </div>
          </>
        )}

        {currentStep === "tone" && (
          <>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
              <h2 style={{ fontSize: "clamp(1.25rem, 3vw, 1.75rem)", fontWeight: 700, margin: 0 }}>
                What&apos;s your posting style?
              </h2>
              <p style={{ color: "var(--muted)", fontSize: "0.9rem", margin: 0 }}>
                Pick the tone that sounds most like you.
              </p>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.6rem", justifyContent: "center" }}>
              {TONE_OPTIONS.map((t) => (
                <button key={t.id} type="button" onClick={() => setSelectedTone(t.id)} style={pill(selectedTone === t.id)}>
                  {t.label}
                </button>
              ))}
            </div>
          </>
        )}

        {currentStep === "avoid" && (
          <>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
              <h2 style={{ fontSize: "clamp(1.25rem, 3vw, 1.75rem)", fontWeight: 700, margin: 0 }}>
                Anything to avoid?
              </h2>
              <p style={{ color: "var(--muted)", fontSize: "0.9rem", margin: 0 }}>
                Topics, tones, or competitors to steer clear of. Optional.
              </p>
            </div>
            <TagInput
              tags={prohibitedTopics}
              setTags={setProhibitedTopics}
              placeholder="e.g. politics, crypto, competitors…"
            />
          </>
        )}

        {currentStep === "notes" && (
          <>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
              <h2 style={{ fontSize: "clamp(1.25rem, 3vw, 1.75rem)", fontWeight: 700, margin: 0 }}>
                Anything else we should know?
              </h2>
              <p style={{ color: "var(--muted)", fontSize: "0.9rem", margin: 0 }}>
                Posting schedule, formatting rules, hard constraints. Optional.
              </p>
            </div>
            <textarea
              value={extraNotes}
              onChange={(e) => setExtraNotes(e.target.value)}
              rows={4}
              placeholder="e.g. I only post Mon–Fri. Never use hashtags. Keep LinkedIn under 1500 chars."
              style={{
                width: "100%",
                padding: "0.875rem 1rem",
                borderRadius: "0.5rem",
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(255,255,255,0.04)",
                color: "var(--foreground)",
                fontSize: "0.95rem",
                resize: "vertical",
                outline: "none",
                lineHeight: 1.6,
                boxSizing: "border-box",
              }}
            />
          </>
        )}

        {currentStep === "mode" && (
          <>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
              <h2 style={{ fontSize: "clamp(1.25rem, 3vw, 1.75rem)", fontWeight: 700, margin: 0 }}>
                How much control do you want?
              </h2>
              <p style={{ color: "var(--muted)", fontSize: "0.9rem", margin: 0 }}>
                You can change this any time from settings.
              </p>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem", width: "100%" }}>
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
                      padding: "1rem 1.125rem",
                      borderRadius: "0.75rem",
                      border: `1px solid ${active ? "rgba(109,107,245,0.55)" : "rgba(255,255,255,0.1)"}`,
                      background: active ? "rgba(109,107,245,0.1)" : "rgba(255,255,255,0.02)",
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
                        marginTop: 1,
                      }}
                    />
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "0.1rem" }}>
                      <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                        <span style={{ fontWeight: 600, fontSize: "0.925rem" }}>{m.label}</span>
                        {"recommended" in m && m.recommended && (
                          <span style={{
                            fontSize: "0.6rem", padding: "0.1rem 0.45rem", borderRadius: "0.25rem",
                            background: "rgba(109,107,245,0.25)", color: "var(--accent)", fontWeight: 700, letterSpacing: "0.05em",
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

            {mode === "autopilot" && (
              <label style={{
                display: "flex", gap: "0.75rem", padding: "0.875rem 1rem", borderRadius: "0.625rem",
                border: "1px solid rgba(248,113,113,0.25)", background: "rgba(248,113,113,0.05)",
                cursor: "pointer", textAlign: "left", alignItems: "flex-start", width: "100%", boxSizing: "border-box",
              }}>
                <input
                  type="checkbox"
                  checked={autopilotAck}
                  onChange={(e) => setAutopilotAck(e.target.checked)}
                  style={{ marginTop: 2, accentColor: "var(--accent)", flexShrink: 0 }}
                />
                <span style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.75)", lineHeight: 1.55 }}>
                  I understand Influuc will publish posts automatically on my behalf. I can set a daily cap, undo any post, and switch modes at any time.
                </span>
              </label>
            )}
          </>
        )}
      </div>

      {/* Navigation */}
      <div style={{ display: "flex", gap: "0.75rem", justifyContent: "space-between", alignItems: "center" }}>
        {step > 0 ? (
          <button
            type="button"
            onClick={() => setStep((s) => s - 1)}
            style={{
              padding: "0.75rem 1.25rem",
              borderRadius: "0.5rem",
              border: "1px solid rgba(255,255,255,0.12)",
              background: "transparent",
              color: "var(--muted)",
              fontSize: "0.875rem",
              cursor: "pointer",
            }}
          >
            ← Back
          </button>
        ) : (
          <div />
        )}

        {isLast ? (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isPending || !canSubmit}
            style={{
              padding: "0.875rem 1.75rem",
              borderRadius: "0.625rem",
              background: canSubmit && !isPending ? "var(--accent)" : "rgba(255,255,255,0.08)",
              color: canSubmit && !isPending ? "#fff" : "var(--muted)",
              fontWeight: 700,
              fontSize: "0.95rem",
              border: "none",
              cursor: canSubmit && !isPending ? "pointer" : "default",
            }}
          >
            {isPending ? "Generating your first week…" : "Generate my first week →"}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setStep((s) => s + 1)}
            disabled={!canAdvance()}
            style={{
              padding: "0.875rem 1.75rem",
              borderRadius: "0.625rem",
              background: canAdvance() ? "var(--accent)" : "rgba(255,255,255,0.08)",
              color: canAdvance() ? "#fff" : "var(--muted)",
              fontWeight: 600,
              fontSize: "0.95rem",
              border: "none",
              cursor: canAdvance() ? "pointer" : "default",
            }}
          >
            {(currentStep === "avoid" || currentStep === "notes") ? "Skip →" : "Next →"}
          </button>
        )}
      </div>

      {isLast && (
        <p style={{ fontSize: "0.75rem", color: "var(--muted)", textAlign: "center", margin: 0 }}>
          Your first 21 X posts and 7 LinkedIn posts will be ready in ~60 seconds.
        </p>
      )}
    </div>
  );
}
