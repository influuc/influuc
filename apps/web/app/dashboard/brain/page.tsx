import { getCurrentFounder } from "@/lib/founder";
import { createServiceClient } from "@/lib/supabase/service";
import { redirect } from "next/navigation";
import { FactActions, AddFactForm } from "./brain-client";

const LAYER_LABELS: Record<string, string> = {
  identity:       "Identity",
  expertise:      "Expertise",
  positioning:    "Positioning",
  audience:       "Audience",
  personality:    "Personality",
  goals:          "Goals",
  beliefs:        "Beliefs",
  experience:     "Experience",
  achievements:   "Achievements",
  interests:      "Interests",
  voice:          "Voice & Tone",
  social_proof:   "Social Proof",
  pain_points:    "Pain Points",
  values:         "Values",
};

const LAYER_ORDER = [
  "identity", "positioning", "expertise", "audience",
  "personality", "voice", "goals", "beliefs",
  "achievements", "experience", "interests", "values",
  "pain_points", "social_proof",
];

export default async function BrainPage() {
  let founder;
  try {
    founder = await getCurrentFounder();
  } catch {
    redirect("/sign-in");
  }

  if (founder.onboarding_state !== "done") {
    redirect(`/onboarding/${founder.onboarding_state}`);
  }

  const db = createServiceClient();

  const { data: facts } = await db
    .from("brain_facts")
    .select("id, layer, key, content, confidence, status, source_kind, created_at")
    .eq("founder_id", founder.id)
    .order("confidence", { ascending: false });

  const allFacts = facts ?? [];
  const active = allFacts.filter(f => f.status === "active");
  const candidates = allFacts.filter(f => f.status === "candidate");

  function groupByLayer(items: typeof allFacts) {
    const map = new Map<string, typeof allFacts>();
    for (const f of items) {
      const layer = f.layer ?? "other";
      if (!map.has(layer)) map.set(layer, []);
      map.get(layer)!.push(f);
    }
    return map;
  }

  const activeByLayer = groupByLayer(active);

  const sortedLayers = [
    ...LAYER_ORDER.filter(l => activeByLayer.has(l)),
    ...Array.from(activeByLayer.keys()).filter(l => !LAYER_ORDER.includes(l)),
  ];

  const firstName = founder.display_name?.split(" ")[0] ?? "there";

  return (
    <div style={{
      padding: "2rem 2.5rem 4rem",
      maxWidth: 860,
      margin: "0 auto",
      width: "100%",
      display: "flex",
      flexDirection: "column",
      gap: "2rem",
    }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: "1.4rem", fontWeight: 700, letterSpacing: "-0.025em", margin: 0 }}>
          Founder Brain
        </h1>
        <p style={{ color: "var(--muted)", fontSize: "0.82rem", marginTop: "0.3rem" }}>
          {active.length} active facts that shape every post {firstName} publishes
        </p>
      </div>

      {/* Stats row */}
      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
        <StatChip value={active.length} label="active facts" color="var(--success)" />
        <StatChip value={candidates.length} label="needs review" color="#fb923c" />
        <StatChip value={sortedLayers.length} label="categories" color="var(--accent-fg)" />
      </div>

      {/* Candidates — show first so founder can action them */}
      {candidates.length > 0 && (
        <section style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            paddingBottom: "0.625rem", borderBottom: "1px solid rgba(251,146,60,0.2)",
          }}>
            <h2 style={{
              fontSize: "0.75rem", fontWeight: 600, letterSpacing: "0.06em",
              textTransform: "uppercase", color: "#fb923c", margin: 0,
            }}>
              Needs your review
            </h2>
            <span style={{ fontSize: "0.7rem", color: "var(--muted-2)" }}>
              Confirm or dismiss low-confidence facts
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {candidates.map(fact => (
              <div key={fact.id} style={{
                display: "flex", alignItems: "flex-start", gap: "0.875rem",
                padding: "0.875rem 1rem",
                background: "rgba(251,146,60,0.04)", border: "1px solid rgba(251,146,60,0.15)",
                borderRadius: 10,
              }}>
                <span style={{
                  width: 7, height: 7, borderRadius: "50%", flexShrink: 0,
                  marginTop: "0.35rem", background: "#fb923c",
                }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  {fact.key && fact.key !== fact.content && (
                    <p style={{ fontSize: "0.7rem", fontWeight: 600, color: "var(--muted-2)", margin: "0 0 0.2rem", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                      {fact.key} · {LAYER_LABELS[fact.layer ?? ""] ?? fact.layer}
                    </p>
                  )}
                  <p style={{ fontSize: "0.875rem", color: "var(--fg)", lineHeight: 1.6, margin: 0 }}>
                    {fact.content}
                  </p>
                </div>
                <FactActions factId={fact.id} type="candidate" />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Empty state */}
      {active.length === 0 && candidates.length === 0 && (
        <div style={{
          padding: "3rem 2rem", textAlign: "center",
          background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--radius)",
        }}>
          <p style={{ color: "var(--muted)", fontSize: "0.875rem", lineHeight: 1.6, margin: 0 }}>
            No brain facts yet. Your Founder Brain builds up as the AI analyses your content during onboarding.
          </p>
        </div>
      )}

      {/* Active facts by layer */}
      {sortedLayers.map(layer => {
        const layerFacts = activeByLayer.get(layer) ?? [];
        return (
          <section key={layer} style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              paddingBottom: "0.625rem", borderBottom: "1px solid var(--border)",
            }}>
              <h2 style={{
                fontSize: "0.75rem", fontWeight: 600, letterSpacing: "0.06em",
                textTransform: "uppercase", color: "var(--muted-2)", margin: 0,
              }}>
                {LAYER_LABELS[layer] ?? layer}
              </h2>
              <span style={{ fontSize: "0.7rem", color: "var(--muted-2)" }}>
                {layerFacts.length} fact{layerFacts.length !== 1 ? "s" : ""}
              </span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {layerFacts.map(fact => (
                <div key={fact.id} style={{
                  display: "flex", alignItems: "flex-start", gap: "0.875rem",
                  padding: "0.875rem 1rem", background: "var(--card)",
                  border: "1px solid var(--border)", borderRadius: 10,
                }}>
                  <span style={{
                    width: 7, height: 7, borderRadius: "50%", flexShrink: 0, marginTop: "0.35rem",
                    background: (fact.confidence ?? 0) >= 0.8 ? "var(--success)" :
                                (fact.confidence ?? 0) >= 0.5 ? "var(--accent)" : "var(--muted)",
                  }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {fact.key && fact.key !== fact.content && (
                      <p style={{ fontSize: "0.7rem", fontWeight: 600, color: "var(--muted-2)", margin: "0 0 0.2rem", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                        {fact.key}
                      </p>
                    )}
                    <p style={{ fontSize: "0.875rem", color: "var(--fg)", lineHeight: 1.6, margin: 0 }}>
                      {fact.content}
                    </p>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexShrink: 0, alignSelf: "flex-start" }}>
                    {fact.source_kind && (
                      <span style={{
                        fontSize: "0.65rem", padding: "2px 7px", borderRadius: 4,
                        background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)",
                        color: "var(--muted-2)",
                      }}>
                        {fact.source_kind}
                      </span>
                    )}
                    <FactActions factId={fact.id} type="active" />
                  </div>
                </div>
              ))}
            </div>
          </section>
        );
      })}

      {/* Add fact */}
      <AddFactForm />
    </div>
  );
}

function StatChip({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: "0.5rem",
      padding: "0.4rem 0.875rem", borderRadius: 8,
      background: "var(--card)", border: "1px solid var(--border)",
    }}>
      <span style={{ fontWeight: 700, fontSize: "0.95rem", color }}>{value}</span>
      <span style={{ fontSize: "0.75rem", color: "var(--muted)" }}>{label}</span>
    </div>
  );
}
