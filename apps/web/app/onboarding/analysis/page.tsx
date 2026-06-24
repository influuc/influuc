import { getCurrentFounder } from "@/lib/founder";
import { redirect } from "next/navigation";
import { AnalysisProgress } from "./analysis-progress";

/**
 * /onboarding/analysis — Stage 5
 *
 * Server Component: validates auth + state, then passes founder context to
 * the client component which polls extraction_jobs for live progress.
 */
export default async function AnalysisPage() {
  let founder;
  try {
    founder = await getCurrentFounder();
  } catch {
    redirect("/sign-in");
  }

  if (founder.onboarding_state === "summary") redirect("/onboarding/summary");
  if (founder.onboarding_state === "paywall") redirect("/onboarding/paywall");
  if (founder.onboarding_state === "preferences" || founder.onboarding_state === "trial") redirect("/onboarding/preferences");
  if (founder.onboarding_state === "done") redirect("/dashboard");

  if (
    founder.onboarding_state === "landing" ||
    founder.onboarding_state === "connect" ||
    founder.onboarding_state === "extension"
  ) {
    redirect("/onboarding/connect");
  }

  if (founder.onboarding_state === "capture") redirect("/onboarding/capture");

  return (
    <div style={{
      flex: 1, display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      padding: "3rem 1.5rem", gap: "2.5rem", textAlign: "center",
    }}>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", alignItems: "center", maxWidth: 480 }}>
        <div style={{
          width: 52, height: 52, borderRadius: "50%",
          background: "rgba(109,107,245,0.12)", border: "1px solid rgba(109,107,245,0.25)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "1.35rem", marginBottom: 4,
        }}>🧠</div>
        <h1 style={{ fontSize: "clamp(1.5rem, 4vw, 2.25rem)", fontWeight: 700, letterSpacing: "-0.03em", margin: 0, lineHeight: 1.1 }}>
          Building your Founder Brain
        </h1>
        <p style={{ color: "rgba(255,255,255,0.45)", maxWidth: "44ch", lineHeight: 1.7, margin: 0, fontSize: "0.95rem" }}>
          We&apos;re reading your content and extracting what makes you distinct.
          This usually takes 30–90 seconds.
        </p>
      </div>
      <AnalysisProgress founderId={founder.id} />
    </div>
  );
}
