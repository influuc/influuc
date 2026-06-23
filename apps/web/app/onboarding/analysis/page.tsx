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
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "3rem 1.5rem",
        gap: "2rem",
        textAlign: "center",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "0.5rem",
          alignItems: "center",
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
          Step 4 of 5
        </span>
        <h1
          style={{
            fontSize: "clamp(1.5rem, 4vw, 2.25rem)",
            fontWeight: 700,
            maxWidth: "26ch",
          }}
        >
          Building your Brain
        </h1>
        <p
          style={{
            color: "var(--muted)",
            maxWidth: "44ch",
            lineHeight: 1.65,
          }}
        >
          We&apos;re reading your content and extracting what makes you distinct.
          This usually takes 30–90 seconds.
        </p>
      </div>

      <AnalysisProgress founderId={founder.id} />
    </div>
  );
}
