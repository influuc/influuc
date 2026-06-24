import { getCurrentFounder } from "@/lib/founder";
import { createServiceClient } from "@/lib/supabase/service";
import { redirect } from "next/navigation";
import { CaptureForm } from "./capture-form";

export default async function CapturePage() {
  let founder;
  try {
    founder = await getCurrentFounder();
  } catch {
    redirect("/sign-in");
  }

  if (!["extension", "capture"].includes(founder.onboarding_state ?? "")) {
    if (["connect", "landing"].includes(founder.onboarding_state ?? "")) {
      redirect("/onboarding/connect");
    }
    if (["analysis", "summary"].includes(founder.onboarding_state ?? "")) {
      redirect(`/onboarding/${founder.onboarding_state}`);
    }
  }

  const db = createServiceClient();

  // Advance state from 'extension' → 'capture' when user reaches this page
  if (founder.onboarding_state === "extension") {
    await db
      .from("founders")
      .update({ onboarding_state: "capture" })
      .eq("id", founder.id)
      .eq("onboarding_state", "extension");
  }

  const { data: connections } = await db
    .from("platform_connections")
    .select("platform, handle")
    .eq("founder_id", founder.id)
    .eq("status", "active");

  const xConn = connections?.find((c) => c.platform === "x");
  const liConn = connections?.find((c) => c.platform === "linkedin");

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
        }}>📡</div>
        <h1 style={{ fontSize: "clamp(1.5rem, 4vw, 2.25rem)", fontWeight: 700, letterSpacing: "-0.03em", margin: 0, lineHeight: 1.1 }}>
          Import your content
        </h1>
        <p style={{ color: "rgba(255,255,255,0.45)", maxWidth: "44ch", lineHeight: 1.7, margin: 0, fontSize: "0.95rem" }}>
          We&apos;ll scan your X posts, LinkedIn activity, and website so the AI
          can learn your exact voice. Tabs open and close automatically.
        </p>
      </div>

      <CaptureForm
        founderId={founder.id}
        hasX={!!xConn}
        xHandle={xConn?.handle ?? null}
        hasLinkedIn={!!liConn}
      />
    </div>
  );
}
