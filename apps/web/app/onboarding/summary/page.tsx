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
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "3rem 1.5rem",
        gap: "2rem",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "0.5rem",
          alignItems: "center",
          textAlign: "center",
        }}
      >
        <span
          style={{
            fontSize: "0.72rem",
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: "var(--accent)",
            fontWeight: 700,
          }}
        >
          Step 5 of 5
        </span>
        <h1
          style={{
            fontSize: "clamp(1.5rem, 4vw, 2.25rem)",
            fontWeight: 700,
            maxWidth: "26ch",
          }}
        >
          Your Founder Brain
        </h1>
        <p
          style={{
            color: "var(--muted)",
            maxWidth: "44ch",
            lineHeight: 1.65,
          }}
        >
          We extracted {totalFacts} facts about you. Confirm what&apos;s right,
          edit what&apos;s off. Each correction makes Influuc sharper.
        </p>
      </div>

      {totalFacts === 0 ? (
        <div
          style={{
            width: "100%",
            maxWidth: "560px",
            padding: "2rem",
            borderRadius: "0.875rem",
            border: "1px solid rgba(255,255,255,0.1)",
            background: "rgba(255,255,255,0.03)",
            textAlign: "center",
          }}
        >
          <p style={{ color: "var(--muted)", marginBottom: "1rem" }}>
            No facts were extracted yet. This happens if the analysis job
            hasn&apos;t finished or if Trigger.dev isn&apos;t running locally.
          </p>
          <a
            href="/onboarding/analysis"
            style={{ color: "var(--accent)", fontSize: "0.88rem" }}
          >
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
