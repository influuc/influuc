import { getCurrentFounder } from "@/lib/founder";
import { createServiceClient } from "@/lib/supabase/service";
import { redirect } from "next/navigation";
import { FactActions, AddFactForm } from "./brain-client";

const LAYER_LABELS: Record<string, string> = {
  identity:      "Identity",
  expertise:     "Expertise",
  offer:         "Offer",
  audience:      "Audience",
  positioning:   "Positioning",
  belief:        "Beliefs",
  story:         "Story",
  writing_style: "Writing Style",
  goal:          "Goals",
};

const LAYER_COLORS: Record<string, string> = {
  identity:      "#a78bfa",
  expertise:     "#60a5fa",
  positioning:   "#fb923c",
  audience:      "#2dd4bf",
  offer:         "#34d399",
  belief:        "#f472b6",
  story:         "#fbbf24",
  writing_style: "#818cf8",
  goal:          "#a3e635",
};

const LAYER_ORDER = [
  "identity", "expertise", "positioning", "audience",
  "offer", "belief", "goal", "story", "writing_style",
];

function humanizeKey(key: string): string {
  return key.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
}

function ConfidenceChip({ value }: { value: number | null }) {
  const v     = value ?? 0;
  const label = v >= 0.8 ? "High" : v >= 0.5 ? "Med" : "Low";
  const color = v >= 0.8 ? "#4ade80" : v >= 0.5 ? "#fbbf24" : "#6b6b80";
  const bg    = v >= 0.8 ? "rgba(74,222,128,0.12)" : v >= 0.5 ? "rgba(251,191,36,0.12)" : "rgba(255,255,255,0.05)";
  return (
    <span style={{
      fontSize: "0.58rem", fontWeight: 700, letterSpacing: "0.06em",
      padding: "2px 7px", borderRadius: 99, background: bg, color, flexShrink: 0,
    }}>
      {label}
    </span>
  );
}

function StatCard({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <div style={{
      padding: "1.125rem 1.5rem",
      background: "var(--card)",
      borderRadius: "var(--radius)",
      display: "flex", flexDirection: "column", gap: "0.2rem",
    }}>
      <span style={{ fontSize: "1.75rem", fontWeight: 800, color, letterSpacing: "-0.04em", lineHeight: 1 }}>
        {value}
      </span>
      <span style={{ fontSize: "0.72rem", color: "var(--muted)" }}>{label}</span>
    </div>
  );
}

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

  const allFacts   = facts ?? [];
  const active     = allFacts.filter(f => f.status === "active");
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
  const sortedLayers  = [
    ...LAYER_ORDER.filter(l => activeByLayer.has(l)),
    ...Array.from(activeByLayer.keys()).filter(l => !LAYER_ORDER.includes(l)),
  ];

  const firstName = founder.display_name?.split(" ")[0] ?? "there";

  return (
    <div style={{
      padding: "2rem 2.5rem 5rem",
      maxWidth: 1100,
      margin: "0 auto",
      width: "100%",
      display: "flex",
      flexDirection: "column",
      gap: "1.75rem",
    }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1rem" }}>
        <div>
          <h1 style={{ fontSize: "1.6rem", fontWeight: 700, letterSpacing: "-0.03em", margin: 0, color: "var(--fg)" }}>
            Founder Brain
          </h1>
          <p style={{ color: "var(--muted)", fontSize: "0.82rem", marginTop: "0.35rem" }}>
            {active.length > 0
              ? `${active.length} verified facts shaping everything ${firstName} publishes`
              : "Build your brain — facts about you personalise every AI output"}
          </p>
        </div>
      </div>

      {/* Stats — no border, matches dashboard stat card pattern */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.875rem" }}>
        <StatCard value={active.length}       label="Active Facts"  color="#4ade80" />
        <StatCard value={candidates.length}   label="Needs Review"  color="#fb923c" />
        <StatCard value={sortedLayers.length} label="Categories"    color="#a5b4fc" />
      </div>

      {/* Candidates — single card, left orange accent, rows inside */}
      {candidates.length > 0 && (
        <section style={{
          background: "var(--card)",
          borderRadius: "var(--radius)",
          overflow: "hidden",
          borderLeft: "3px solid rgba(251,146,60,0.5)",
        }}>
          <div style={{
            padding: "1rem 1.5rem",
            display: "flex", alignItems: "center", gap: "0.75rem",
            borderBottom: "1px solid var(--border)",
          }}>
            <span style={{ fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#fb923c", flex: 1 }}>
              Needs your review
            </span>
            <span style={{ fontSize: "0.7rem", color: "var(--muted-2)" }}>
              {candidates.length} pending · confirm or dismiss
            </span>
          </div>
          {candidates.map((fact, i) => (
            <div key={fact.id} style={{
              display: "flex", gap: "1rem", alignItems: "flex-start",
              padding: "0.875rem 1.5rem",
              borderBottom: i < candidates.length - 1 ? "1px solid var(--border)" : "none",
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                {fact.key && fact.key !== fact.content && (
                  <p style={{
                    fontSize: "0.62rem", fontWeight: 700, color: "#fb923c",
                    margin: "0 0 0.3rem", letterSpacing: "0.06em", textTransform: "uppercase",
                  }}>
                    {humanizeKey(fact.key)}
                  </p>
                )}
                <p style={{ fontSize: "0.875rem", color: "var(--fg)", lineHeight: 1.65, margin: 0 }}>
                  {fact.content}
                </p>
              </div>
              <FactActions factId={fact.id} type="candidate" />
            </div>
          ))}
        </section>
      )}

      {/* Empty state */}
      {active.length === 0 && candidates.length === 0 && (
        <div style={{
          padding: "4rem 2rem", textAlign: "center",
          background: "var(--card)", borderRadius: "var(--radius)",
        }}>
          <p style={{ fontSize: "1rem", fontWeight: 600, color: "var(--fg)", margin: "0 0 0.5rem" }}>
            No brain facts yet
          </p>
          <p style={{ color: "var(--muted)", fontSize: "0.82rem", lineHeight: 1.6, margin: "0 auto", maxWidth: 360 }}>
            Your Founder Brain builds during onboarding as the AI analyses your content. You can also add facts manually below.
          </p>
        </div>
      )}

      {/* Active facts — ONE card, layer headers as internal section dividers */}
      {sortedLayers.length > 0 && (
        <section style={{
          background: "var(--card)",
          borderRadius: "var(--radius)",
          overflow: "hidden",
        }}>
          {sortedLayers.map((layer, li) => {
            const layerFacts = activeByLayer.get(layer) ?? [];
            const color = LAYER_COLORS[layer] ?? "#6b6b80";

            return (
              <div key={layer}>
                {/* Layer header — acts as a row divider */}
                <div style={{
                  padding: "0.75rem 1.5rem",
                  display: "flex", alignItems: "center", gap: "0.75rem",
                  borderTop: li > 0 ? "1px solid var(--border)" : "none",
                  borderBottom: "1px solid var(--border)",
                }}>
                  <div style={{ width: 8, height: 8, borderRadius: 2, background: color, flexShrink: 0 }} />
                  <span style={{ fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--muted-2)", flex: 1 }}>
                    {LAYER_LABELS[layer] ?? layer}
                  </span>
                  <span style={{ fontSize: "0.68rem", color: "var(--muted-2)" }}>
                    {layerFacts.length}
                  </span>
                </div>

                {/* Fact rows */}
                {layerFacts.map((fact, i) => (
                  <div key={fact.id} style={{
                    display: "flex", gap: "1rem", alignItems: "flex-start",
                    padding: "0.875rem 1.5rem",
                    borderBottom: i < layerFacts.length - 1 ? "1px solid var(--border)" : "none",
                  }}>
                    <ConfidenceChip value={fact.confidence} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {fact.key && fact.key !== fact.content && (
                        <p style={{
                          fontSize: "0.62rem", fontWeight: 700, color,
                          margin: "0 0 0.3rem", letterSpacing: "0.06em", textTransform: "uppercase", opacity: 0.8,
                        }}>
                          {humanizeKey(fact.key)}
                        </p>
                      )}
                      <p style={{ fontSize: "0.875rem", color: "var(--fg)", lineHeight: 1.65, margin: 0 }}>
                        {fact.content}
                      </p>
                    </div>
                    <div style={{ display: "flex", gap: "0.375rem", flexShrink: 0, alignItems: "center", alignSelf: "flex-start" }}>
                      {fact.source_kind && (
                        <span style={{
                          fontSize: "0.58rem", padding: "2px 6px", borderRadius: 4,
                          background: "rgba(255,255,255,0.04)", color: "var(--muted-2)",
                        }}>
                          {fact.source_kind}
                        </span>
                      )}
                      <FactActions factId={fact.id} type="active" />
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </section>
      )}

      {/* Add fact */}
      <AddFactForm />
    </div>
  );
}
