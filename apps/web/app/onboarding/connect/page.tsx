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
          Step 1 of 5
        </span>
        <h1
          style={{
            fontSize: "clamp(1.5rem, 4vw, 2.25rem)",
            fontWeight: 700,
            maxWidth: "22ch",
          }}
        >
          Connect your accounts
        </h1>
        <p
          style={{
            color: "var(--muted)",
            maxWidth: "42ch",
            lineHeight: 1.65,
          }}
        >
          Connect X and LinkedIn so Influuc can learn from your existing content
          and post on your behalf — securely, with your approval every step.
        </p>
      </div>

      <ConnectForm connections={connectionMap} initialError={error} />
    </div>
  );
}
