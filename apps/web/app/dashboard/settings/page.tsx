import { getCurrentFounder } from "@/lib/founder";
import { createServiceClient } from "@/lib/supabase/service";
import { redirect } from "next/navigation";
import { SettingsForm } from "./settings-form";
import { RegenerateWeekBtn } from "./regenerate-week-btn";
import { KillSwitch } from "./kill-switch";

const PLATFORM_LABELS: Record<string, string> = { x: "X (Twitter)", linkedin: "LinkedIn" };
const PLATFORM_ICONS: Record<string, string> = { x: "𝕏", linkedin: "in" };
const CONNECT_URLS: Record<string, string> = {
  x: "/api/oauth/x?returnTo=/dashboard/settings",
  linkedin: "/api/oauth/linkedin?returnTo=/dashboard/settings",
};

export default async function SettingsPage() {
  let founder;
  try {
    founder = await getCurrentFounder();
  } catch {
    redirect("/sign-in");
  }

  const db = createServiceClient();
  const [{ data: prefs }, { data: connections }] = await Promise.all([
    db.from("operating_preferences")
      .select("mode, focus_topics, content_goals, tone, prohibited_topics, extra_notes, max_autopilot_per_day, publishing_paused")
      .eq("founder_id", founder.id)
      .single(),
    db.from("platform_connections")
      .select("platform, status")
      .eq("founder_id", founder.id),
  ]);

  const connMap = Object.fromEntries((connections ?? []).map(c => [c.platform, c.status]));

  return (
    <div style={{
      flex: 1,
      display: "flex",
      flexDirection: "column",
      padding: "2.5rem 1.5rem 4rem",
      maxWidth: "680px",
      margin: "0 auto",
      width: "100%",
      gap: "2rem",
    }}>
      <div>
        <h1 style={{ fontSize: "clamp(1.2rem, 3vw, 1.6rem)", fontWeight: 700, margin: 0 }}>Settings</h1>
        <p style={{ color: "var(--muted)", fontSize: "0.85rem", marginTop: "0.3rem" }}>
          Content preferences and autopilot mode. Changes take effect on your next content generation.
        </p>
      </div>

      <KillSwitch initialPaused={prefs?.publishing_paused ?? false} />

      <SettingsForm
        initialMode={(prefs?.mode as "manual" | "assisted" | "autopilot") ?? "assisted"}
        initialFocusTopics={prefs?.focus_topics ?? []}
        initialContentGoals={prefs?.content_goals ?? []}
        initialTone={prefs?.tone ?? "direct"}
        initialProhibitedTopics={prefs?.prohibited_topics ?? []}
        initialExtraNotes={prefs?.extra_notes ?? ""}
        initialMaxPerDay={prefs?.max_autopilot_per_day ?? 3}
      />

      {/* Divider */}
      <div style={{ height: 1, background: "var(--border)" }} />

      {/* Connected Accounts */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        <p style={{ fontSize: "0.7rem", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--muted)", margin: 0 }}>
          Connected Accounts
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
          {(["x", "linkedin"] as const).map(platform => {
            const status = connMap[platform];
            const isConnected = status === "active";
            const needsReauth = status === "needs_reauth";
            return (
              <div key={platform} style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "0.75rem 1rem", borderRadius: "10px",
                border: `1px solid ${needsReauth ? "rgba(239,68,68,0.3)" : "var(--border)"}`,
                background: needsReauth ? "rgba(239,68,68,0.05)" : "var(--surface)",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                  <span style={{ fontSize: "1rem", fontWeight: 700, width: 24, textAlign: "center" }}>{PLATFORM_ICONS[platform]}</span>
                  <div>
                    <p style={{ margin: 0, fontWeight: 600, fontSize: "0.85rem" }}>{PLATFORM_LABELS[platform]}</p>
                    <p style={{ margin: 0, fontSize: "0.72rem", color: needsReauth ? "#f87171" : isConnected ? "#4ade80" : "var(--muted)" }}>
                      {needsReauth ? "Reconnection required" : isConnected ? "Connected" : "Not connected"}
                    </p>
                  </div>
                </div>
                <a href={CONNECT_URLS[platform]} style={{
                  fontSize: "0.78rem", fontWeight: 600, padding: "0.35rem 0.85rem",
                  borderRadius: "7px", textDecoration: "none",
                  background: needsReauth ? "rgba(239,68,68,0.15)" : "rgba(109,107,245,0.15)",
                  color: needsReauth ? "#f87171" : "var(--accent)",
                  border: `1px solid ${needsReauth ? "rgba(239,68,68,0.3)" : "rgba(109,107,245,0.3)"}`,
                }}>
                  {isConnected || needsReauth ? "Reconnect" : "Connect"}
                </a>
              </div>
            );
          })}
        </div>
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: "var(--border)" }} />

      {/* Content generation */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        <p style={{ fontSize: "0.7rem", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--muted)", margin: 0 }}>
          Content Generation
        </p>
        <RegenerateWeekBtn />
      </div>
    </div>
  );
}
