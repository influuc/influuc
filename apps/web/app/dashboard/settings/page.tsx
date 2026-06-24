import { getCurrentFounder } from "@/lib/founder";
import { createServiceClient } from "@/lib/supabase/service";
import { redirect } from "next/navigation";
import { SettingsForm } from "./settings-form";
import { RegenerateWeekBtn } from "./regenerate-week-btn";

export default async function SettingsPage() {
  let founder;
  try {
    founder = await getCurrentFounder();
  } catch {
    redirect("/sign-in");
  }

  const db = createServiceClient();
  const { data: prefs } = await db
    .from("operating_preferences")
    .select("mode, focus_topics, content_goals, tone, prohibited_topics, extra_notes")
    .eq("founder_id", founder.id)
    .single();

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

      <SettingsForm
        initialMode={(prefs?.mode as "manual" | "assisted" | "autopilot") ?? "assisted"}
        initialFocusTopics={prefs?.focus_topics ?? []}
        initialContentGoals={prefs?.content_goals ?? []}
        initialTone={prefs?.tone ?? "direct"}
        initialProhibitedTopics={prefs?.prohibited_topics ?? []}
        initialExtraNotes={prefs?.extra_notes ?? ""}
      />

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
