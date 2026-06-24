import { createServiceClient } from "@/lib/supabase/service";

interface Props {
  founderId: string;
}

const PLATFORM_LABELS: Record<string, string> = {
  x: "X (Twitter)",
  linkedin: "LinkedIn",
};

const OAUTH_URLS: Record<string, string> = {
  x: "/api/oauth/x/initiate",
  linkedin: "/api/oauth/linkedin/initiate",
};

export async function ReauthBanner({ founderId }: Props) {
  const db = createServiceClient();
  const { data: connections } = await db
    .from("platform_connections")
    .select("platform, status, handle")
    .eq("founder_id", founderId)
    .in("status", ["needs_reauth", "revoked", "error"]);

  if (!connections || connections.length === 0) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
      {connections.map((conn) => (
        <div key={conn.platform} style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "1rem",
          padding: "0.875rem 1.125rem",
          borderRadius: "0.75rem",
          border: "1px solid rgba(248,113,113,0.25)",
          background: "rgba(248,113,113,0.05)",
          flexWrap: "wrap",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
            <span style={{ fontSize: "0.9rem" }}>⚠</span>
            <div>
              <p style={{ fontWeight: 600, fontSize: "0.875rem", margin: 0, color: "#fca5a5" }}>
                {PLATFORM_LABELS[conn.platform] ?? conn.platform} connection lost
              </p>
              <p style={{ fontSize: "0.775rem", color: "rgba(255,255,255,0.5)", margin: "0.15rem 0 0" }}>
                {conn.handle ? `@${conn.handle} · ` : ""}Posts will fail until you reconnect.
              </p>
            </div>
          </div>
          <a href={OAUTH_URLS[conn.platform] ?? "#"} style={{
            padding: "0.45rem 1rem",
            borderRadius: "0.5rem",
            background: "rgba(248,113,113,0.12)",
            border: "1px solid rgba(248,113,113,0.3)",
            color: "#fca5a5",
            fontSize: "0.8rem",
            fontWeight: 600,
            textDecoration: "none",
            whiteSpace: "nowrap",
            flexShrink: 0,
          }}>
            Reconnect →
          </a>
        </div>
      ))}
    </div>
  );
}
