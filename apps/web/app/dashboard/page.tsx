import { getCurrentFounder } from "@/lib/founder";
import { createServiceClient } from "@/lib/supabase/service";
import { redirect } from "next/navigation";

/**
 * /dashboard — Stage 10 (stub)
 *
 * Empty-state dashboard. Opportunities + drafts queue ships in M5.
 * This page exists to complete the onboarding flow and give the
 * founder a home screen.
 */
export default async function DashboardPage() {
  let founder;
  try {
    founder = await getCurrentFounder();
  } catch {
    redirect("/sign-in");
  }

  // Redirect back into onboarding if not finished
  const incompleteStates = [
    "landing",
    "connect",
    "extension",
    "capture",
    "analysis",
    "summary",
    "paywall",
    "trial",
    "preferences",
  ];
  if (incompleteStates.includes(founder.onboarding_state ?? "")) {
    redirect(`/onboarding/${founder.onboarding_state}`);
  }

  const db = createServiceClient();
  const { count: factCount } = await db
    .from("brain_facts")
    .select("*", { count: "exact", head: true })
    .eq("founder_id", founder.id)
    .eq("status", "active");

  const { data: prefs } = await db
    .from("operating_preferences")
    .select("mode")
    .eq("founder_id", founder.id)
    .single();

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        padding: "2.5rem 1.5rem",
        maxWidth: "860px",
        margin: "0 auto",
        width: "100%",
        gap: "2.5rem",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h1 style={{ fontSize: "clamp(1.5rem, 3vw, 2rem)", fontWeight: 700, margin: 0 }}>
            {founder.display_name ? `Welcome back, ${founder.display_name.split(" ")[0]}.` : "Your dashboard"}
          </h1>
          <p style={{ color: "var(--muted)", marginTop: "0.375rem", fontSize: "0.9rem" }}>
            {factCount
              ? `Your Brain has ${factCount} confirmed facts · Mode: ${prefs?.mode ?? "assisted"}`
              : "Your Brain is ready — content queue ships in M5"}
          </p>
        </div>
      </div>

      {/* Empty state panels */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
          gap: "1rem",
        }}
      >
        <EmptyPanel
          title="Opportunities"
          description="Influuc will surface relevant conversations, trends, and signals matched to your expertise."
          badge="Coming in M5"
        />
        <EmptyPanel
          title="Drafts queue"
          description="On-voice content drafts ready for your review will appear here."
          badge="Coming in M5"
        />
        <EmptyPanel
          title="Published"
          description="Posts you've approved and published across X and LinkedIn."
          badge="Coming in M5"
        />
      </div>

      {/* Brain preview link */}
      <div
        style={{
          padding: "1.25rem 1.5rem",
          borderRadius: "0.875rem",
          border: "1px solid rgba(109,107,245,0.2)",
          background: "rgba(109,107,245,0.04)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "1rem",
        }}
      >
        <div>
          <p style={{ fontWeight: 600, margin: 0 }}>Your Founder Brain</p>
          <p style={{ color: "var(--muted)", fontSize: "0.82rem", marginTop: "0.25rem" }}>
            {factCount
              ? `${factCount} active facts across identity, expertise, offer, audience, and more`
              : "Brain data will appear here once extraction is complete"}
          </p>
        </div>
        <a
          href="/onboarding/summary"
          style={{
            padding: "0.5rem 1rem",
            borderRadius: "0.5rem",
            background: "rgba(109,107,245,0.15)",
            color: "var(--accent)",
            fontSize: "0.82rem",
            fontWeight: 600,
            textDecoration: "none",
            flexShrink: 0,
          }}
        >
          Review Brain →
        </a>
      </div>
    </div>
  );
}

function EmptyPanel({
  title,
  description,
  badge,
}: {
  title: string;
  description: string;
  badge?: string;
}) {
  return (
    <div
      style={{
        padding: "1.25rem",
        borderRadius: "0.75rem",
        border: "1px solid rgba(255,255,255,0.08)",
        background: "rgba(255,255,255,0.02)",
        display: "flex",
        flexDirection: "column",
        gap: "0.625rem",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <p style={{ fontWeight: 600, margin: 0, fontSize: "0.9rem" }}>{title}</p>
        {badge && (
          <span
            style={{
              fontSize: "0.65rem",
              padding: "0.15rem 0.5rem",
              borderRadius: "0.25rem",
              background: "rgba(255,255,255,0.08)",
              color: "var(--muted)",
              fontWeight: 600,
              letterSpacing: "0.05em",
              flexShrink: 0,
            }}
          >
            {badge}
          </span>
        )}
      </div>
      <p style={{ fontSize: "0.8rem", color: "var(--muted)", margin: 0, lineHeight: 1.55 }}>
        {description}
      </p>
    </div>
  );
}
