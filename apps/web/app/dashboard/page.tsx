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

  let xStats = { total: 0, approved: 0, published: 0 };
  let liStats = { total: 0, approved: 0, published: 0 };

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
        if (p.status === "published") xStats.published++;
      } else {
        liStats.total++;
        if (p.status === "approved") liStats.approved++;
        if (p.status === "published") liStats.published++;
      }
    }
  }

  const strat = strategy?.strategy as { summary?: string } | undefined;
  const firstName = founder.display_name?.split(" ")[0] ?? "there";
  const mode = prefs?.mode ?? "assisted";

  return (
    <div style={{
      padding: "2rem 2.5rem 4rem",
      maxWidth: 1000,
      margin: "0 auto",
      width: "100%",
      display: "flex",
      flexDirection: "column",
      gap: "1.5rem",
    }}>
      {/* Alerts */}
      <ReauthBanner founderId={founder.id} />
      {founder.reflection_pending && <ReflectionBanner />}

      {/* Page header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, letterSpacing: "-0.025em", color: "var(--fg)" }}>
            Welcome back, {firstName}
          </h1>
          <p style={{ color: "var(--muted)", fontSize: "0.85rem", marginTop: "0.25rem" }}>
            {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
          </p>
        </div>
        <ModeBadge mode={mode} />
      </div>

      {/* Strategy card — full width */}
      {strategy && (
        <Card>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem", flexWrap: "wrap" }}>
            <div style={{ flex: 1 }}>
              <Label>This week · {fmtWeek(strategy.week_start)}</Label>
              <p style={{ fontWeight: 600, fontSize: "0.95rem", marginTop: "0.375rem", color: "var(--fg)", lineHeight: 1.5 }}>
                {strat?.summary ?? "Weekly strategy ready"}
              </p>
            </div>
            <div style={{ display: "flex", gap: "0.625rem", flexShrink: 0 }}>
              <StatPill value={`${xStats.approved + liStats.approved}`} label="approved" color="var(--accent-fg)" />
              <StatPill value={`${xStats.published + liStats.published}`} label="published" color="var(--success)" />
            </div>
          </div>
        </Card>
      )}

      {/* Bento grid — 2 platform cards */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
        <PlatformCard
          href="/dashboard/x"
          title="X Posts"
          meta="3 per day · 21 total"
          icon={<XIcon />}
          approved={xStats.approved}
          published={xStats.published}
          total={xStats.total}
        />
        <PlatformCard
          href="/dashboard/linkedin"
          title="LinkedIn"
          meta="1 per day · 7 total"
          icon={<LinkedInIcon />}
          approved={liStats.approved}
          published={liStats.published}
          total={liStats.total}
        />
      </div>

      {/* Bottom row — brain + mode */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "1rem", alignItems: "stretch" }}>
        <Card>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <Label>Founder Brain</Label>
              <p style={{ fontWeight: 600, fontSize: "0.95rem", marginTop: "0.375rem", color: "var(--fg)" }}>
                {factCount ?? 0} active facts
              </p>
              <p style={{ color: "var(--muted)", fontSize: "0.8rem", marginTop: "0.2rem" }}>
                Identity · Expertise · Audience · Positioning
              </p>
            </div>
            <Link href="/onboarding/summary" style={{
              padding: "0.5rem 1rem",
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--border-med)",
              background: "transparent",
              color: "var(--muted)",
              fontSize: "0.8rem",
              fontWeight: 500,
              textDecoration: "none",
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}>
              Review
            </Link>
          </div>
        </Card>

        <Link href="/dashboard/settings" style={{ textDecoration: "none" }}>
          <div style={{
            background: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
            padding: "1.25rem 1.5rem",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            gap: "0.25rem",
            minWidth: 160,
            cursor: "pointer",
          }}>
            <Label>Mode</Label>
            <p style={{ fontWeight: 700, fontSize: "1rem", color: "var(--fg)", textTransform: "capitalize", marginTop: "0.375rem" }}>
              {mode}
            </p>
            <p style={{ color: "var(--accent-fg)", fontSize: "0.75rem", marginTop: "0.125rem" }}>Change →</p>
          </div>
        </Link>
      </div>
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      background: "var(--card)",
      border: "1px solid var(--border)",
      borderRadius: "var(--radius)",
      padding: "1.25rem 1.5rem",
    }}>
      {children}
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p style={{
      fontSize: "0.7rem",
      fontWeight: 600,
      letterSpacing: "0.08em",
      textTransform: "uppercase",
      color: "var(--muted)",
      margin: 0,
    }}>
      {children}
    </p>
  );
}

function StatPill({ value, label, color }: { value: string; label: string; color: string }) {
  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      padding: "0.5rem 0.875rem",
      borderRadius: "var(--radius-sm)",
      background: "rgba(255,255,255,0.04)",
      border: "1px solid var(--border)",
      minWidth: 64,
    }}>
      <span style={{ fontWeight: 700, fontSize: "1.1rem", color }}>{value}</span>
      <span style={{ fontSize: "0.65rem", color: "var(--muted)", marginTop: "0.1rem" }}>{label}</span>
    </div>
  );
}

function ModeBadge({ mode }: { mode: string }) {
  return (
    <span style={{
      fontSize: "0.7rem",
      fontWeight: 600,
      letterSpacing: "0.06em",
      textTransform: "uppercase",
      padding: "0.3rem 0.75rem",
      borderRadius: 999,
      background: "var(--accent-bg)",
      color: "var(--accent-fg)",
      border: "1px solid rgba(109,107,245,0.2)",
    }}>
      {mode}
    </span>
  );
}

function PlatformCard({ href, title, meta, icon, approved, published, total }: {
  href: string; title: string; meta: string; icon: React.ReactNode;
  approved: number; published: number; total: number;
}) {
  const pct = total > 0 ? Math.round(((approved + published) / total) * 100) : 0;
  const allDone = total > 0 && pct === 100;

  return (
    <Link href={href} style={{ textDecoration: "none" }}>
      <div style={{
        background: "var(--card)",
        border: `1px solid ${allDone ? "rgba(74,222,128,0.2)" : "var(--border)"}`,
        borderRadius: "var(--radius)",
        padding: "1.25rem 1.5rem",
        display: "flex",
        flexDirection: "column",
        gap: "1.25rem",
        cursor: "pointer",
        transition: "border-color 0.15s, background 0.15s",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <p style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--fg)", margin: 0 }}>{title}</p>
            <p style={{ color: "var(--muted)", fontSize: "0.775rem", marginTop: "0.2rem" }}>{meta}</p>
          </div>
          <span style={{ color: "var(--muted-2)", opacity: 0.7, marginTop: 2 }}>{icon}</span>
        </div>

        {total === 0 ? (
          <p style={{ fontSize: "0.8rem", color: "var(--muted-2)" }}>No posts yet</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
            <div style={{ height: 3, borderRadius: 99, background: "var(--border)", overflow: "hidden" }}>
              <div style={{
                height: "100%",
                width: `${pct}%`,
                background: allDone ? "var(--success)" : "var(--accent)",
                borderRadius: 99,
                transition: "width 0.4s ease",
              }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "0.75rem", color: allDone ? "var(--success)" : "var(--muted)" }}>
                {approved + published}/{total} ready
              </span>
              {published > 0 && (
                <span style={{ fontSize: "0.7rem", color: "var(--muted-2)" }}>{published} live</span>
              )}
            </div>
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
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function LinkedInIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}
