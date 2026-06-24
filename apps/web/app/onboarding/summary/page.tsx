import { getCurrentFounder } from "@/lib/founder";
import { createServiceClient } from "@/lib/supabase/service";
import { redirect } from "next/navigation";
import { SummaryClient } from "./summary-client";

const LAYER_ORDER = [
  "identity",
  "expertise",
  "offer",
  "audience",
  "positioning",
  "belief",
  "story",
  "writing_style",
  "goal",
] as const;

const LAYER_LABELS: Record<string, string> = {
  identity: "Identity",
  expertise: "Expertise",
  offer: "What you offer",
  audience: "Your audience",
  positioning: "Positioning",
  belief: "Core beliefs",
  story: "Your story",
  writing_style: "Writing style",
  goal: "Goals",
};

/**
 * /onboarding/summary — Stage 6
 *
 * Shows extracted brain facts as confirmable cards, grouped by layer.
 * Founder confirms / corrects each one. At least one confirmation unlocks
 * the "Continue to paywall" button.
 */
export default async function SummaryPage() {
  let founder;
  try {
    founder = await getCurrentFounder();
  } catch {
    redirect("/sign-in");
  }

  if (
    founder.onboarding_state === "landing" ||
    founder.onboarding_state === "connect"
  ) {
    redirect("/onboarding/connect");
  }
  if (founder.onboarding_state === "analysis" || founder.onboarding_state === "capture") {
    redirect(`/onboarding/${founder.onboarding_state}`);
  }
  if (
    founder.onboarding_state === "paywall" ||
    founder.onboarding_state === "trial" ||
    founder.onboarding_state === "preferences"
  ) {
    redirect(`/onboarding/${founder.onboarding_state}`);
  }
  if (founder.onboarding_state === "done") {
    redirect("/dashboard");
  }

  const db = createServiceClient();
  const { data: facts } = await db
    .from("brain_facts")
    .select("id, layer, key, content, confidence, status")
    .eq("founder_id", founder.id)
    .in("status", ["candidate", "active"])
    .order("salience", { ascending: false });

  // Group by layer in display order
  const grouped = LAYER_ORDER.reduce(
    (acc, layer) => {
      acc[layer] = (facts ?? []).filter((f) => f.layer === layer);
      return acc;
    },
    {} as Record<string, typeof facts>
  );

  const totalFacts = facts?.length ?? 0;
  const confirmedFacts = facts?.filter((f) => f.status === "active").length ?? 0;

  return (
    <div style={{
      flex: 1, display: "flex", flexDirection: "column",
      alignItems: "center", padding: "3rem 1.5rem 4rem", gap: "2.5rem",
    }}>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", alignItems: "center", textAlign: "center", maxWidth: 560 }}>
        <div style={{
          width: 52, height: 52, borderRadius: "50%",
          background: "rgba(109,107,245,0.12)", border: "1px solid rgba(109,107,245,0.25)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "1.35rem", marginBottom: 4,
        }}>✦</div>
        <h1 style={{ fontSize: "clamp(1.5rem, 4vw, 2.25rem)", fontWeight: 700, letterSpacing: "-0.03em", margin: 0, lineHeight: 1.1 }}>
          Your Founder Brain
        </h1>
        <p style={{ color: "rgba(255,255,255,0.45)", maxWidth: "44ch", lineHeight: 1.7, margin: 0, fontSize: "0.95rem" }}>
          We extracted <strong style={{ color: "#f4f4f5" }}>{totalFacts} facts</strong> about you. Confirm what&apos;s right,
          edit what&apos;s off. Each correction makes Influuc sharper.
        </p>
      </div>

      {totalFacts === 0 ? (
        <div style={{
          width: "100%", maxWidth: 560, padding: "2rem", borderRadius: 14,
          border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.025)", textAlign: "center",
        }}>
          <p style={{ color: "rgba(255,255,255,0.4)", marginBottom: "1rem", lineHeight: 1.65, fontSize: "0.9rem" }}>
            No facts were extracted yet. This happens if the analysis job
            hasn&apos;t finished or if Trigger.dev isn&apos;t running locally.
          </p>
          <a href="/onboarding/analysis" style={{ color: "#a5b4fc", fontSize: "0.88rem", fontWeight: 500 }}>
            ← Back to analysis
          </a>
        </div>
      ) : (
        <SummaryClient
          grouped={grouped as Record<string, Array<{ id: string; layer: string; key: string; content: string; confidence: number; status: string }>>}
          layerOrder={[...LAYER_ORDER]}
          layerLabels={LAYER_LABELS}
          initialConfirmedCount={confirmedFacts}
        />
      )}
    </div>
  );
}
