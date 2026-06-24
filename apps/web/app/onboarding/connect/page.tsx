import { createClient } from "@/lib/supabase/server";
import { getCurrentFounder } from "@/lib/founder";
import { redirect } from "next/navigation";
import { ConnectForm } from "./connect-form";
import type { Tables } from "@influuc/db";

type PlatformConnection = Tables<"platform_connections">;

/**
 * /onboarding/connect — Step 1 of the connect-first onboarding flow.
 *
 * Server Component: reads the current founder + their platform_connections
 * and passes connection status down to the Client Component.
 */
export default async function ConnectPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  let founder;
  try {
    founder = await getCurrentFounder();
  } catch {
    redirect("/sign-in");
  }

  // Do NOT auto-redirect away — the user may want to connect both platforms
  // before continuing. Only the "Continue" button on ConnectForm moves them on.

  // Need a separate client for the platform_connections query
  const supabase = await createClient();
  const { data: connections } = await supabase
    .from("platform_connections")
    .select("platform, handle, status")
    .eq("founder_id", founder.id);

  const connectionMap = Object.fromEntries(
    (connections ?? []).map((c: Pick<PlatformConnection, "platform" | "handle" | "status">) => [
      c.platform,
      { handle: c.handle, status: c.status },
    ])
  ) as Record<string, { handle: string | null; status: string }>;

  return (
    <div style={{
      flex: 1,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "3rem 1.5rem",
      gap: "2.5rem",
      textAlign: "center",
    }}>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", alignItems: "center", maxWidth: 480 }}>
        <div style={{
          width: 52, height: 52, borderRadius: "50%",
          background: "rgba(109,107,245,0.12)",
          border: "1px solid rgba(109,107,245,0.25)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "1.35rem", marginBottom: 4,
        }}>
          🔗
        </div>
        <h1 style={{ fontSize: "clamp(1.5rem, 4vw, 2.25rem)", fontWeight: 700, letterSpacing: "-0.03em", margin: 0, lineHeight: 1.1 }}>
          Connect your accounts
        </h1>
        <p style={{ color: "rgba(255,255,255,0.45)", maxWidth: "42ch", lineHeight: 1.7, margin: 0, fontSize: "0.95rem" }}>
          Connect X and LinkedIn so Influuc can learn from your existing content
          and post on your behalf — securely, with your approval every step.
        </p>
      </div>

      <ConnectForm connections={connectionMap} initialError={error} />
    </div>
  );
}
