import { getCurrentFounder } from "@/lib/founder";
import { redirect } from "next/navigation";
import { PreferencesForm } from "./preferences-form";

/**
 * /onboarding/preferences — Stage 9
 *
 * Founder picks how much autonomy to grant Influuc.
 * Mode choice is persisted to operating_preferences before
 * advancing to the dashboard.
 */
export default async function PreferencesPage({
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

  // Allow trial + preferences state (Stripe webhook may be slightly behind)
  if (
    founder.onboarding_state !== "preferences" &&
    founder.onboarding_state !== "trial" &&
    founder.onboarding_state !== "paywall"
  ) {
    if (founder.onboarding_state === "done") redirect("/dashboard");
    if (
      founder.onboarding_state === "summary" ||
      founder.onboarding_state === "analysis"
    ) {
      redirect(`/onboarding/${founder.onboarding_state}`);
    }
  }

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
        {checkout === "success" && (
          <div
            style={{
              padding: "0.5rem 1rem",
              borderRadius: "0.5rem",
              background: "rgba(74,222,128,0.1)",
              border: "1px solid rgba(74,222,128,0.25)",
              color: "#4ade80",
              fontSize: "0.82rem",
              fontWeight: 600,
              marginBottom: "0.5rem",
            }}
          >
            Trial started — welcome to Influuc!
          </div>
        )}
        <span
          style={{
            fontSize: "0.72rem",
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: "var(--accent)",
            fontWeight: 700,
          }}
        >
          One last step
        </span>
        <h1
          style={{
            fontSize: "clamp(1.5rem, 4vw, 2.25rem)",
            fontWeight: 700,
            maxWidth: "22ch",
          }}
        >
          How should Influuc operate?
        </h1>
        <p
          style={{
            color: "var(--muted)",
            maxWidth: "44ch",
            lineHeight: 1.65,
          }}
        >
          You can change this at any time from your dashboard settings.
        </p>
      </div>

      <PreferencesForm />
    </div>
  );
}
