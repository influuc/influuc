import { getCurrentFounder } from "@/lib/founder";
import { createServiceClient } from "@/lib/supabase/service";
import { redirect } from "next/navigation";
import { CaptureForm } from "./capture-form";

/**
 * /onboarding/capture — Stage 4 (fallback path without extension)
 *
 * Server Component: resolves current connections + founder profile URLs,
 * then passes context to the client form.
 *
 * Plasmo extension (M5) will eventually short-circuit this step by posting
 * raw_sources directly from the browser, but until then this fallback
 * (website scrape + X API + manual text) seeds the Brain.
 */
export default async function CapturePage() {
  let founder;
  try {
    founder = await getCurrentFounder();
  } catch {
    redirect("/sign-in");
  }

  // Allow both 'extension' (skip path) and 'capture' state
  if (!["extension", "capture"].includes(founder.onboarding_state ?? "")) {
    if (
      founder.onboarding_state === "connect" ||
      founder.onboarding_state === "landing"
    ) {
      redirect("/onboarding/connect");
    }
    if (
      founder.onboarding_state === "analysis" ||
      founder.onboarding_state === "summary"
    ) {
      redirect(`/onboarding/${founder.onboarding_state}`);
    }
  }

  // Advance state from 'extension' → 'capture' on skip
  if (founder.onboarding_state === "extension") {
    const db = createServiceClient();
    await db
      .from("founders")
      .update({ onboarding_state: "capture" })
      .eq("id", founder.id)
      .eq("onboarding_state", "extension");
  }

  // Check what platforms are connected to pre-fill the form
  const db = createServiceClient();
  const { data: connections } = await db
    .from("platform_connections")
    .select("platform, handle, platform_user_id")
    .eq("founder_id", founder.id)
    .eq("status", "active");

  const xConn = connections?.find((c) => c.platform === "x");
  const liConn = connections?.find((c) => c.platform === "linkedin");

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
          Step 3 of 5
        </span>
        <h1
          style={{
            fontSize: "clamp(1.5rem, 4vw, 2.25rem)",
            fontWeight: 700,
            maxWidth: "26ch",
          }}
        >
          Import your content
        </h1>
        <p
          style={{
            color: "var(--muted)",
            maxWidth: "44ch",
            lineHeight: 1.65,
          }}
        >
          Influuc reads your existing content to understand you. Add a website
          URL, pull your recent posts, or paste a bio — the more you share, the
          smarter it gets.
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
