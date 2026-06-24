import { getCurrentFounder } from "@/lib/founder";
import { redirect } from "next/navigation";
import { PreferencesForm } from "./preferences-form";

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

  if (
    founder.onboarding_state !== "preferences" &&
    founder.onboarding_state !== "trial" &&
    founder.onboarding_state !== "paywall"
  ) {
    if (founder.onboarding_state === "done") redirect("/dashboard");
    if (["summary", "analysis"].includes(founder.onboarding_state ?? "")) {
      redirect(`/onboarding/${founder.onboarding_state}`);
    }
  }

  return (
    <div style={{
      flex: 1, display: "flex", flexDirection: "column",
      alignItems: "center", padding: "3rem 1.5rem 4rem", gap: "2.5rem",
    }}>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", alignItems: "center", textAlign: "center", maxWidth: 560 }}>
        {checkout === "success" && (
          <div className="badge badge-success" style={{ marginBottom: 4 }}>
            ✓ Trial started — welcome to Influuc!
          </div>
        )}
        <div style={{
          width: 52, height: 52, borderRadius: "50%",
          background: "rgba(109,107,245,0.12)", border: "1px solid rgba(109,107,245,0.25)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "1.35rem", marginBottom: 4,
        }}>⚙️</div>
        <h1 style={{ fontSize: "clamp(1.5rem, 4vw, 2.25rem)", fontWeight: 700, letterSpacing: "-0.03em", margin: 0, lineHeight: 1.1 }}>
          Set up your content strategy
        </h1>
        <p style={{ color: "rgba(255,255,255,0.45)", maxWidth: "44ch", lineHeight: 1.7, margin: 0, fontSize: "0.95rem" }}>
          This tells Influuc what to write about and how. Your first week of posts generates immediately after.
        </p>
      </div>

      <PreferencesForm />
    </div>
  );
}
