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
      flex: 1,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "3rem 1.5rem",
      gap: "2rem",
      textAlign: "center",
    }}>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", alignItems: "center" }}>
        <span style={{ fontSize: "0.72rem", letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--accent)", fontWeight: 700 }}>
          Step 3 of 5
        </span>
        <h1 style={{ fontSize: "clamp(1.5rem, 4vw, 2.25rem)", fontWeight: 700, maxWidth: "26ch" }}>
          Import your content
        </h1>
        <p style={{ color: "var(--muted)", maxWidth: "44ch", lineHeight: 1.65 }}>
          We&apos;ll scan your X posts, LinkedIn activity, and website in the background.
          Just click scan — tabs open and close automatically.
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
