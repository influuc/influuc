import { createServiceClient } from "@/lib/supabase/service";

interface Props {
  founderId: string;
}

const PLATFORM_LABELS: Record<string, string> = { x: "X", linkedin: "LinkedIn" };
const OAUTH_URLS: Record<string, string> = { x: "/api/oauth/x", linkedin: "/api/oauth/linkedin" };

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
          padding: "0.875rem 1.25rem",
          borderRadius: "var(--radius)",
          background: "var(--card)",
          border: "1px solid rgba(248,113,113,0.2)",
          flexWrap: "wrap",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--error)", flexShrink: 0 }} />
            <div>
              <p style={{ fontWeight: 600, fontSize: "0.875rem", color: "var(--fg)", margin: 0 }}>
                {PLATFORM_LABELS[conn.platform] ?? conn.platform} connection lost
              </p>
              <p style={{ fontSize: "0.775rem", color: "var(--muted)", margin: "0.15rem 0 0" }}>
                {conn.handle ? `@${conn.handle} · ` : ""}Posts will fail until you reconnect.
              </p>
            </div>
          </div>
          <a
            href={OAUTH_URLS[conn.platform] ?? "#"}
            style={{
              padding: "0.45rem 1rem",
              borderRadius: "var(--radius-sm)",
              background: "var(--error-bg)",
              border: "1px solid rgba(248,113,113,0.2)",
              color: "var(--error)",
              fontSize: "0.8rem",
              fontWeight: 600,
              textDecoration: "none",
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
          >
            Reconnect →
          </a>
        </div>
      ))}
    </div>
  );
}
