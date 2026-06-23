import { getCurrentFounder } from "@/lib/founder";
import { createServiceClient } from "@/lib/supabase/service";
import { redirect } from "next/navigation";
import { PaywallClient } from "./paywall-client";

/**
 * /onboarding/paywall — Stage 7
 *
 * Shows the value prop after the founder has seen their Brain, then
 * routes them to Stripe checkout.
 */
export default async function PaywallPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string }>;
}) {
  const { checkout } = await searchParams;

  let founder;
  try {
    founder = await getCurrentFounder();
  } catch {
    redirect("/sign-in");
  }

  if (
    founder.onboarding_state === "landing" ||
    founder.onboarding_state === "connect" ||
    founder.onboarding_state === "capture" ||
    founder.onboarding_state === "analysis" ||
    founder.onboarding_state === "extension"
  ) {
    redirect("/onboarding/connect");
  }

  if (founder.onboarding_state === "summary") {
    redirect("/onboarding/summary");
  }

  if (
    founder.onboarding_state === "trial" ||
    founder.onboarding_state === "preferences"
  ) {
    redirect("/onboarding/preferences");
  }

  if (founder.onboarding_state === "done") {
    redirect("/dashboard");
  }

  // Count confirmed facts for the value-anchored copy
  const db = createServiceClient();
  const { count: factCount } = await db
    .from("brain_facts")
    .select("*", { count: "exact", head: true })
    .eq("founder_id", founder.id)
    .eq("status", "active");

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "3rem 1.5rem",
        gap: "2.5rem",
        textAlign: "center",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", alignItems: "center" }}>
        <div
          style={{
            fontSize: "0.72rem",
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: "var(--accent)",
            fontWeight: 700,
          }}
        >
          Activate your operator
        </div>
        <h1
          style={{
            fontSize: "clamp(1.75rem, 4vw, 2.5rem)",
            fontWeight: 700,
            maxWidth: "20ch",
            lineHeight: 1.2,
          }}
        >
          Your Brain is ready.
          <br />
          Let it work for you.
        </h1>
        <p style={{ color: "var(--muted)", maxWidth: "42ch", lineHeight: 1.65 }}>
          {factCount
            ? `We captured ${factCount} facts about your expertise, audience, and voice.`
            : "We've learned your expertise, audience, and voice."}{" "}
          Influuc uses this to find opportunities and draft content — so you
          only review what matters.
        </p>
      </div>

      <PaywallClient cancelled={checkout === "cancelled"} />
    </div>
  );
}
