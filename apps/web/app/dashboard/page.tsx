import { getCurrentFounder } from "@/lib/founder";
import { createServiceClient } from "@/lib/supabase/service";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ReflectionBanner } from "./reflection-banner";
import { ReauthBanner } from "./reauth-banner";
import { GeneratingPoller } from "./generating-poller";

function getPostTime(postType: string, sortOrder: number): string {
  if (postType === "linkedin") return "9:30 AM IST";
  if (postType === "x_long")   return "7:00 PM IST";
  return sortOrder === 0 ? "9:00 AM IST" : "1:00 PM IST";
}

function getPostSlotOrder(postType: string, sortOrder: number): number {
  if (postType === "x_short" && sortOrder === 0) return 0;
  if (postType === "linkedin") return 1;
  if (postType === "x_short" && sortOrder === 1) return 2;
  if (postType === "x_long") return 3;
  return 99;
}

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

  const mode = prefs?.mode ?? "assisted";
  const modeLabel = mode === "assisted" ? "Automatic" : mode === "autopilot" ? "Autopilot" : "Manual";
  const firstName = founder.display_name?.split(" ")[0] ?? "there";
  const strat = strategy?.strategy as { summary?: string } | undefined;

  if (!strategy) {
    return (
      <div style={{ padding: "2rem 2.5rem 4rem", maxWidth: 1100, margin: "0 auto", width: "100%", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        <ReauthBanner founderId={founder.id} />
        <Header firstName={firstName} modeLabel={modeLabel} />
        <GeneratingPoller />
      </div>
    );
  }

  const { data: allPosts } = await db
    .from("weekly_posts")
    .select("id, platform, status, scheduled_date, post_type, sort_order, content")
    .eq("founder_id", founder.id)
    .eq("strategy_id", strategy.id)
    .order("scheduled_date")
    .order("sort_order");

  const posts = allPosts ?? [];

  if (posts.length === 0) {
    return (
      <div style={{ padding: "2rem 2.5rem 4rem", maxWidth: 1100, margin: "0 auto", width: "100%", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        <ReauthBanner founderId={founder.id} />
        <Header firstName={firstName} modeLabel={modeLabel} />
        <GeneratingPoller />
      </div>
    );
  }

  let xStats = { total: 0, approved: 0, published: 0, draft: 0 };
  let liStats = { total: 0, approved: 0, published: 0, draft: 0 };
  for (const p of posts) {
    if (p.platform === "x") {
      xStats.total++;
      if (p.status === "approved") xStats.approved++;
      if (p.status === "published") xStats.published++;
      if (p.status === "draft") xStats.draft++;
    } else {
      liStats.total++;
      if (p.status === "approved") liStats.approved++;
      if (p.status === "published") liStats.published++;
      if (p.status === "draft") liStats.draft++;
    }
  }

  const todayStr = new Date().toISOString().slice(0, 10);
  const nowHour = new Date().getHours() + new Date().getMinutes() / 60;
  const timeToHour: Record<string, number> = { "9:00 AM IST": 9, "9:30 AM IST": 9.5, "1:00 PM IST": 13, "7:00 PM IST": 19 };

  const upcomingApproved = posts
    .filter(p => (p.status === "approved" || (mode === "autopilot" && p.status === "draft")) && p.scheduled_date >= todayStr)
    .map(p => ({
      ...p,
      time: getPostTime(p.post_type, p.sort_order ?? 0),
      slotOrder: getPostSlotOrder(p.post_type, p.sort_order ?? 0),
    }))
    .filter(p => {
      if (p.scheduled_date === todayStr) return (timeToHour[p.time] ?? 0) > nowHour;
      return true;
    })
    .sort((a, b) => {
      if (a.scheduled_date !== b.scheduled_date) return a.scheduled_date.localeCompare(b.scheduled_date);
      return a.slotOrder - b.slotOrder;
    });

  const nextPost = upcomingApproved[0] ?? null;
  const nextPostLabel = nextPost ? (() => {
    const d = nextPost.scheduled_date;
    if (d === todayStr) return `Today · ${nextPost.time}`;
    const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
    const tmrStr = tomorrow.toISOString().slice(0, 10);
    if (d === tmrStr) return `Tomorrow · ${nextPost.time}`;
    return `${new Date(d + "T00:00:00Z").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" })} · ${nextPost.time}`;
  })() : null;

  const postTypeLabel = nextPost?.post_type === "x_short" ? "Short post" : nextPost?.post_type === "x_long" ? "Long thread" : "Article";

  return (
    <div style={{
      padding: "2rem 2.5rem 4rem",
      maxWidth: 1100,
      margin: "0 auto",
      width: "100%",
      display: "flex",
      flexDirection: "column",
      gap: "1.25rem",
    }}>
      <ReauthBanner founderId={founder.id} />
      {founder.reflection_pending && <ReflectionBanner />}

      <Header firstName={firstName} modeLabel={modeLabel} />

      {/* Review urgency */}
      {(xStats.draft > 0 || liStats.draft > 0) && (
        <div style={{
          padding: "0.75rem 1.25rem",
          borderRadius: "var(--radius)",
          background: "rgba(251,146,60,0.06)",
          display: "flex",
          alignItems: "center",
          gap: "1rem",
          flexWrap: "wrap",
        }}>
          <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "#fb923c" }}>
            Needs review
          </span>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            {xStats.draft > 0 && (
              <Link href="/dashboard/x" style={{
                fontSize: "0.78rem", color: "var(--muted)", textDecoration: "none",
                padding: "0.25rem 0.75rem", borderRadius: 6,
                background: "rgba(255,255,255,0.04)",
                display: "flex", alignItems: "center", gap: "0.375rem",
              }}>
                <span style={{ color: "#fb923c", fontWeight: 700 }}>{xStats.draft}</span> X posts →
              </Link>
            )}
            {liStats.draft > 0 && (
              <Link href="/dashboard/linkedin" style={{
                fontSize: "0.78rem", color: "var(--muted)", textDecoration: "none",
                padding: "0.25rem 0.75rem", borderRadius: 6,
                background: "rgba(255,255,255,0.04)",
                display: "flex", alignItems: "center", gap: "0.375rem",
              }}>
                <span style={{ color: "#fb923c", fontWeight: 700 }}>{liStats.draft}</span> LinkedIn posts →
              </Link>
            )}
          </div>
          <span style={{ fontSize: "0.72rem", color: "var(--muted-2)", marginLeft: "auto" }}>
            Unapproved posts are skipped
          </span>
        </div>
      )}

      {/* Hero — Upcoming post */}
      {nextPost ? (
        <div style={{
          background: "linear-gradient(135deg, rgba(109,107,245,0.12) 0%, rgba(109,107,245,0.06) 100%)",
          borderRadius: "var(--radius)",
          padding: "1.75rem 2rem",
          display: "flex",
          gap: "1.5rem",
          alignItems: "flex-start",
          position: "relative",
          overflow: "hidden",
        }}>
          {/* Subtle glow behind */}
          <div style={{
            position: "absolute", top: -60, right: -60,
            width: 200, height: 200,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(109,107,245,0.18) 0%, transparent 70%)",
            pointerEvents: "none",
          }} />

          {/* Platform icon */}
          <div style={{
            width: 52, height: 52, borderRadius: 14, flexShrink: 0,
            background: "rgba(109,107,245,0.25)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 0 20px rgba(109,107,245,0.2)",
          }}>
            {nextPost.platform === "x" ? (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            ) : (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
              </svg>
            )}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Meta row */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", marginBottom: "0.75rem", flexWrap: "wrap" }}>
              <span style={{
                fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.1em",
                textTransform: "uppercase", color: "var(--muted)",
              }}>
                Upcoming Post
              </span>
              <span style={{
                fontSize: "0.72rem", fontWeight: 600, color: "#a5b4fc",
                padding: "2px 10px", borderRadius: 999,
                background: "rgba(109,107,245,0.2)",
              }}>
                {nextPostLabel}
              </span>
              <span style={{ fontSize: "0.7rem", color: "var(--muted-2)" }}>
                {postTypeLabel}
              </span>
            </div>

            {/* Post content — hero text */}
            <p style={{
              fontSize: "1.05rem",
              fontWeight: 500,
              color: "var(--fg)",
              lineHeight: 1.65,
              margin: 0,
              display: "-webkit-box",
              WebkitLineClamp: 3,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}>
              {nextPost.content}
            </p>
          </div>

          <Link
            href={`/dashboard/${nextPost.platform === "x" ? "x" : "linkedin"}`}
            style={{
              padding: "0.5rem 1.1rem", borderRadius: 9,
              background: "rgba(255,255,255,0.08)",
              color: "var(--fg)", fontSize: "0.8rem", fontWeight: 600,
              textDecoration: "none", whiteSpace: "nowrap", flexShrink: 0,
            }}
          >
            View →
          </Link>
        </div>
      ) : (
        <div style={{
          padding: "1.25rem 1.5rem",
          borderRadius: "var(--radius)",
          background: "var(--card)",
          display: "flex", alignItems: "center", gap: "0.75rem",
        }}>
          <p style={{ margin: 0, fontSize: "0.875rem", color: "var(--muted)", lineHeight: 1.5 }}>
            No approved posts scheduled yet.{" "}
            <Link href="/dashboard/x" style={{ color: "var(--accent-fg)", textDecoration: "none" }}>
              Review and approve your X posts →
            </Link>
          </p>
        </div>
      )}

      {/* Strategy card */}
      {strategy && (
        <div style={{
          background: "var(--card)",
          borderRadius: "var(--radius)",
          padding: "1.25rem 1.5rem",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem", flexWrap: "wrap" }}>
            <div style={{ flex: 1 }}>
              <SectionLabel>This week · {fmtWeek(strategy.week_start)}</SectionLabel>
              <p style={{ fontWeight: 600, fontSize: "0.92rem", marginTop: "0.5rem", color: "var(--fg)", lineHeight: 1.55, margin: "0.5rem 0 0" }}>
                {strat?.summary ?? "Weekly strategy ready"}
              </p>
            </div>
            <div style={{ display: "flex", gap: "0.625rem", flexShrink: 0 }}>
              <StatPill value={`${xStats.approved + liStats.approved + xStats.published + liStats.published}`} label="approved" color="var(--success)" />
              <StatPill value={`${xStats.published + liStats.published}`} label="live" color="var(--accent-fg)" />
            </div>
          </div>
        </div>
      )}

      {/* Platform grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
        <PlatformCard
          href="/dashboard/x"
          title="X Posts"
          meta={`3 per day · ${xStats.total} total`}
          platform="x"
          approved={xStats.approved + xStats.published}
          published={xStats.published}
          draft={xStats.draft}
          total={xStats.total}
          nextTime={
            posts.find(p => p.platform === "x" && p.status === "approved" && p.scheduled_date >= todayStr)
              ? getPostTime(
                  posts.find(p => p.platform === "x" && p.status === "approved" && p.scheduled_date >= todayStr)!.post_type,
                  posts.find(p => p.platform === "x" && p.status === "approved" && p.scheduled_date >= todayStr)!.sort_order ?? 0,
                )
              : null
          }
        />
        <PlatformCard
          href="/dashboard/linkedin"
          title="LinkedIn"
          meta={`1 per day · ${liStats.total} total`}
          platform="linkedin"
          approved={liStats.approved + liStats.published}
          published={liStats.published}
          draft={liStats.draft}
          total={liStats.total}
          nextTime={
            posts.find(p => p.platform === "linkedin" && p.status === "approved" && p.scheduled_date >= todayStr)
              ? "9:30 AM IST"
              : null
          }
        />
      </div>

      {/* Bottom row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "1rem", alignItems: "stretch" }}>
        <div style={{ background: "var(--card)", borderRadius: "var(--radius)", padding: "1.25rem 1.5rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <SectionLabel>Founder Brain</SectionLabel>
              <p style={{ fontWeight: 700, fontSize: "1.1rem", marginTop: "0.5rem", color: "var(--fg)" }}>
                {factCount ?? 0} active facts
              </p>
              <p style={{ color: "var(--muted)", fontSize: "0.78rem", marginTop: "0.2rem" }}>
                Identity · Expertise · Audience · Positioning
              </p>
            </div>
            <Link href="/dashboard/brain" style={{
              padding: "0.5rem 1rem",
              borderRadius: "var(--radius-sm)",
              background: "rgba(255,255,255,0.05)",
              color: "var(--muted)",
              fontSize: "0.78rem",
              fontWeight: 500,
              textDecoration: "none",
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}>
              View →
            </Link>
          </div>
        </div>

        <Link href="/dashboard/settings" style={{ textDecoration: "none" }}>
          <div style={{
            background: "var(--card)",
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
            <SectionLabel>Mode</SectionLabel>
            <p style={{ fontWeight: 700, fontSize: "1rem", color: "var(--fg)", marginTop: "0.5rem" }}>
              {modeLabel}
            </p>
            <p style={{ color: "var(--accent-fg)", fontSize: "0.75rem", marginTop: "0.125rem" }}>Change →</p>
          </div>
        </Link>
      </div>
    </div>
  );
}

function Header({ firstName, modeLabel }: { firstName: string; modeLabel: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
      <div>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 700, letterSpacing: "-0.03em", color: "var(--fg)", margin: 0 }}>
          Welcome back, {firstName}
        </h1>
        <p style={{ color: "var(--muted)", fontSize: "0.82rem", marginTop: "0.3rem" }}>
          {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
        </p>
      </div>
      <div style={{
        display: "flex", alignItems: "center", gap: "0.4rem",
        padding: "0.35rem 0.875rem", borderRadius: 999,
        background: "rgba(109,107,245,0.12)",
        fontSize: "0.72rem", fontWeight: 600, color: "var(--accent-fg)",
        letterSpacing: "0.05em",
      }}>
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--success)", display: "inline-block" }} />
        {modeLabel} mode
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={{
      fontSize: "0.65rem",
      fontWeight: 700,
      letterSpacing: "0.1em",
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
      minWidth: 64,
    }}>
      <span style={{ fontWeight: 700, fontSize: "1.1rem", color }}>{value}</span>
      <span style={{ fontSize: "0.63rem", color: "var(--muted)", marginTop: "0.1rem" }}>{label}</span>
    </div>
  );
}

function PlatformCard({ href, title, meta, platform, approved, published, draft, total, nextTime }: {
  href: string; title: string; meta: string; platform: "x" | "linkedin";
  approved: number; published: number; draft: number; total: number;
  nextTime: string | null;
}) {
  const pct = total > 0 ? Math.round((approved / total) * 100) : 0;
  const allDone = total > 0 && approved >= total;

  return (
    <Link href={href} style={{ textDecoration: "none" }}>
      <div style={{
        background: "var(--card)",
        borderRadius: "var(--radius)",
        padding: "1.25rem 1.5rem",
        display: "flex",
        flexDirection: "column",
        gap: "1rem",
        cursor: "pointer",
        height: "100%",
        transition: "background 0.15s",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <p style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--fg)", margin: 0 }}>{title}</p>
            <p style={{ color: "var(--muted)", fontSize: "0.75rem", marginTop: "0.2rem" }}>{meta}</p>
          </div>
          <span style={{ color: "var(--muted-2)", opacity: 0.6, marginTop: 2 }}>
            {platform === "x" ? (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            ) : (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
              </svg>
            )}
          </span>
        </div>

        {total === 0 ? (
          <p style={{ fontSize: "0.8rem", color: "var(--muted-2)" }}>No posts yet</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
            <div style={{ height: 3, borderRadius: 99, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
              <div style={{
                height: "100%",
                width: `${pct}%`,
                background: allDone
                  ? "var(--success)"
                  : platform === "x"
                    ? "linear-gradient(90deg, #6d6bf5, #a5b4fc)"
                    : "linear-gradient(90deg, #0ea5e9, #38bdf8)",
                borderRadius: 99,
                transition: "width 0.4s ease",
              }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "0.75rem", color: allDone ? "var(--success)" : "var(--muted)" }}>
                {approved}/{total} approved
              </span>
              {draft > 0 && (
                <span style={{ fontSize: "0.7rem", color: "var(--warning)", fontWeight: 500 }}>
                  {draft} need review
                </span>
              )}
            </div>
            {nextTime && (
              <div style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>
                <span style={{
                  width: 6, height: 6, borderRadius: "50%",
                  background: "var(--accent)",
                  boxShadow: "0 0 6px rgba(109,107,245,0.6)",
                  flexShrink: 0,
                }} />
                <span style={{ fontSize: "0.72rem", color: "var(--accent-fg)", fontWeight: 500 }}>
                  Next post at {nextTime}
                </span>
              </div>
            )}
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
