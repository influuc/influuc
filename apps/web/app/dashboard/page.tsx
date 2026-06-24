import { getCurrentFounder } from "@/lib/founder";
import { createServiceClient } from "@/lib/supabase/service";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ReflectionBanner } from "./reflection-banner";
import { ReauthBanner } from "./reauth-banner";

export default async function DashboardPage() {
  let founder;
  try {
    founder = await getCurrentFounder();
  } catch {
    redirect("/sign-in");
  }

  const incompleteStates = ["landing", "connect", "extension", "capture", "analysis", "summary", "paywall", "trial", "preferences"];
  if (incompleteStates.includes(founder.onboarding_state ?? "")) {
    redirect(`/onboarding/${founder.onboarding_state}`);
  }

  const db = createServiceClient();

  const [{ count: factCount }, { data: prefs }, { data: strategy }] = await Promise.all([
    db.from("brain_facts").select("*", { count: "exact", head: true }).eq("founder_id", founder.id).eq("status", "active"),
    db.from("operating_preferences").select("mode").eq("founder_id", founder.id).single(),
    db.from("weekly_strategies").select("id, week_start, strategy").eq("founder_id", founder.id).order("created_at", { ascending: false }).limit(1).single(),
  ]);

  let xStats = { total: 0, approved: 0 };
  let liStats = { total: 0, approved: 0 };

  if (strategy) {
    const { data: posts } = await db
      .from("weekly_posts")
      .select("platform, status")
      .eq("founder_id", founder.id)
      .eq("strategy_id", strategy.id);

    for (const p of posts ?? []) {
      if (p.platform === "x") {
        xStats.total++;
        if (p.status === "approved") xStats.approved++;
      } else {
        liStats.total++;
        if (p.status === "approved") liStats.approved++;
      }
    }
  }

  const strat = strategy?.strategy as { summary?: string } | undefined;
  const firstName = founder.display_name?.split(" ")[0] ?? "there";

  return (
    <div style={{
      flex: 1,
      display: "flex",
      flexDirection: "column",
      padding: "2.5rem 1.5rem 4rem",
      maxWidth: "860px",
      margin: "0 auto",
      width: "100%",
      gap: "2rem",
    }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: "clamp(1.4rem, 3vw, 1.9rem)", fontWeight: 700, margin: 0 }}>
          Welcome back, {firstName}.
        </h1>
        <p style={{ color: "var(--muted)", marginTop: "0.375rem", fontSize: "0.875rem" }}>
          {factCount ? `${factCount} brain facts · Mode: ${prefs?.mode ?? "assisted"}` : "Brain ready"}
        </p>
      </div>

      {/* Platform reauth warnings */}
      <ReauthBanner founderId={founder.id} />

      {/* Weekly reflection prompt */}
      {founder.reflection_pending && <ReflectionBanner />}

      {/* This week strategy */}
      {strategy && (
        <div style={{
          padding: "1.25rem 1.5rem",
          borderRadius: "0.875rem",
          border: "1px solid rgba(109,107,245,0.2)",
          background: "rgba(109,107,245,0.04)",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem", flexWrap: "wrap" }}>
            <div>
              <p style={{ fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--accent)", margin: "0 0 0.35rem" }}>
                This week · {fmtWeek(strategy.week_start)}
              </p>
              <p style={{ fontWeight: 600, margin: 0 }}>
                {strat?.summary ?? "Weekly content strategy ready"}
              </p>
            </div>
            <span style={{
              fontSize: "0.75rem",
              padding: "0.25rem 0.625rem",
              borderRadius: "0.375rem",
              background: "rgba(109,107,245,0.15)",
              color: "var(--accent)",
              fontWeight: 600,
              flexShrink: 0,
            }}>
              {xStats.approved + liStats.approved}/{xStats.total + liStats.total} approved
            </span>
          </div>
        </div>
      )}

      {/* Platform cards */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
        <PlatformCard
          href="/dashboard/x"
          title="X Posts"
          subtitle="21 posts · 3 per day"
          icon={<XIcon />}
          approved={xStats.approved}
          total={xStats.total}
          empty={!strategy}
        />
        <PlatformCard
          href="/dashboard/linkedin"
          title="LinkedIn"
          subtitle="7 posts · 1 per day"
          icon={<LinkedInIcon />}
          approved={liStats.approved}
          total={liStats.total}
          empty={!strategy}
        />
      </div>

      {/* Brain card */}
      <div style={{
        padding: "1.25rem 1.5rem",
        borderRadius: "0.875rem",
        border: "1px solid rgba(255,255,255,0.08)",
        background: "rgba(255,255,255,0.02)",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: "1rem",
      }}>
        <div>
          <p style={{ fontWeight: 600, margin: 0, fontSize: "0.9rem" }}>Founder Brain</p>
          <p style={{ color: "var(--muted)", fontSize: "0.8rem", marginTop: "0.2rem" }}>
            {factCount ? `${factCount} active facts across identity, expertise, audience, and more` : "No facts yet"}
          </p>
        </div>
        <Link href="/onboarding/summary" style={{
          padding: "0.5rem 1rem",
          borderRadius: "0.5rem",
          background: "rgba(255,255,255,0.06)",
          color: "var(--muted)",
          fontSize: "0.8rem",
          fontWeight: 600,
          textDecoration: "none",
          flexShrink: 0,
          border: "1px solid rgba(255,255,255,0.08)",
        }}>
          Review →
        </Link>
      </div>
    </div>
  );
}

function PlatformCard({ href, title, subtitle, icon, approved, total, empty }: {
  href: string;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  approved: number;
  total: number;
  empty: boolean;
}) {
  const pct = total > 0 ? Math.round((approved / total) * 100) : 0;

  return (
    <Link href={href} style={{ textDecoration: "none" }}>
      <div style={{
        padding: "1.25rem",
        borderRadius: "0.875rem",
        border: "1px solid rgba(255,255,255,0.08)",
        background: "rgba(255,255,255,0.02)",
        display: "flex",
        flexDirection: "column",
        gap: "1rem",
        cursor: "pointer",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <p style={{ fontWeight: 700, margin: 0, fontSize: "0.95rem" }}>{title}</p>
            <p style={{ color: "var(--muted)", fontSize: "0.78rem", margin: "0.2rem 0 0" }}>{subtitle}</p>
          </div>
          <span style={{ color: "var(--muted)", opacity: 0.6 }}>{icon}</span>
        </div>

        {empty ? (
          <p style={{ fontSize: "0.78rem", color: "var(--muted)", margin: 0 }}>No posts generated yet</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <div style={{ height: 4, borderRadius: 2, background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${pct}%`, background: pct === 100 ? "#4ade80" : "var(--accent)", borderRadius: 2, transition: "width 0.3s" }} />
            </div>
            <p style={{ fontSize: "0.75rem", color: pct === 100 ? "#4ade80" : "var(--muted)", margin: 0 }}>
              {approved}/{total} approved
            </p>
          </div>
        )}
      </div>
    </Link>
  );
}

function fmtWeek(d: string) {
  const start = new Date(d + "T00:00:00Z");
  const end = new Date(d + "T00:00:00Z");
  end.setUTCDate(end.getUTCDate() + 6);
  return `${start.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })} – ${end.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })}`;
}

function XIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function LinkedInIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}
