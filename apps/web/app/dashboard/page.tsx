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

function getSlotOrder(postType: string, sortOrder: number): number {
  if (postType === "x_short" && sortOrder === 0) return 0;
  if (postType === "linkedin") return 1;
  if (postType === "x_short" && sortOrder === 1) return 2;
  if (postType === "x_long") return 3;
  return 99;
}

function daysRemaining(weekStart: string): number {
  const end = new Date(weekStart + "T00:00:00Z");
  end.setUTCDate(end.getUTCDate() + 7);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.max(0, Math.ceil((end.getTime() - today.getTime()) / 86400000));
}

function fmtShortDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00Z");
  return d.toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric", timeZone: "UTC",
  });
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
    db.from("operating_preferences").select("mode, publishing_paused").eq("founder_id", founder.id).single(),
    db.from("weekly_strategies").select("id, week_start, strategy").eq("founder_id", founder.id).order("created_at", { ascending: false }).limit(1).single(),
  ]);

  const mode = prefs?.mode ?? "assisted";
  const modeLabel = mode === "assisted" ? "Automatic" : mode === "autopilot" ? "Autopilot" : "Manual";
  const publishingPaused = prefs?.publishing_paused ?? false;
  const firstName = founder.display_name?.split(" ")[0] ?? "there";
  const strat = strategy?.strategy as { summary?: string } | undefined;

  const todayStr = new Date().toISOString().slice(0, 10);
  const todayFmt = new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
  const stratDaysLeft = strategy ? daysRemaining(strategy.week_start) : 7;

  if (!strategy) {
    return (
      <div style={{ padding: "2rem 2.5rem 4rem", maxWidth: 1100, margin: "0 auto", width: "100%", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        <ReauthBanner founderId={founder.id} />
        <GreetingHeader firstName={firstName} subtitle={`${todayFmt} · ${stratDaysLeft} days remaining till next strategy`} modeLabel={modeLabel} />
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
        <GreetingHeader firstName={firstName} subtitle={`${todayFmt} · ${stratDaysLeft} days remaining till next strategy`} modeLabel={modeLabel} />
        <GeneratingPoller />
      </div>
    );
  }

  // Stats
  let xTotal = 0, xApproved = 0, xPublished = 0, xDraft = 0;
  let liTotal = 0, liApproved = 0, liPublished = 0, liDraft = 0;
  for (const p of posts) {
    const isApproved = p.status === "approved" || p.status === "published" || p.status === "scheduled";
    if (p.platform === "x") {
      xTotal++;
      if (isApproved) xApproved++;
      if (p.status === "published") xPublished++;
      if (p.status === "draft") xDraft++;
    } else {
      liTotal++;
      if (isApproved) liApproved++;
      if (p.status === "published") liPublished++;
      if (p.status === "draft") liDraft++;
    }
  }

  const totalApproved = xApproved + liApproved;
  const totalPublished = xPublished + liPublished;
  const totalDraft = xDraft + liDraft;

  // Content runway — unique future dates with approved content
  const approvedFutureDates = new Set(
    posts
      .filter(p => ["approved", "scheduled", "published"].includes(p.status) && p.scheduled_date >= todayStr)
      .map(p => p.scheduled_date)
  );
  const runwayDays = approvedFutureDates.size;

  // Today's posts
  const todayPosts = posts
    .filter(p => p.scheduled_date === todayStr)
    .map(p => ({
      ...p,
      time: getPostTime(p.post_type, p.sort_order ?? 0),
      slotOrder: getSlotOrder(p.post_type, p.sort_order ?? 0),
    }))
    .sort((a, b) => a.slotOrder - b.slotOrder);

  // Upcoming posts — next 5 after today
  const tomorrowStr = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

  const upcomingPosts = posts
    .filter(p => p.scheduled_date >= tomorrowStr)
    .map(p => ({
      ...p,
      time: getPostTime(p.post_type, p.sort_order ?? 0),
      slotOrder: getSlotOrder(p.post_type, p.sort_order ?? 0),
    }))
    .sort((a, b) => {
      if (a.scheduled_date !== b.scheduled_date) return a.scheduled_date.localeCompare(b.scheduled_date);
      return a.slotOrder - b.slotOrder;
    })
    .slice(0, 5);

  return (
    <div style={{
      padding: "2rem 2.5rem 4rem",
      maxWidth: 1100,
      margin: "0 auto",
      width: "100%",
      display: "flex",
      flexDirection: "column",
      gap: "1.5rem",
    }}>
      <ReauthBanner founderId={founder.id} />
      {publishingPaused && (
        <Link href="/dashboard/settings" style={{ textDecoration: "none" }}>
          <div style={{
            padding: "0.75rem 1.25rem", borderRadius: "var(--radius)",
            background: "rgba(248,113,113,0.07)", border: "1px solid rgba(248,113,113,0.25)",
            display: "flex", alignItems: "center", gap: "0.75rem",
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="6" y="4" width="4" height="16" rx="1" /><rect x="14" y="4" width="4" height="16" rx="1" />
            </svg>
            <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "#f87171" }}>Publishing is paused</span>
            <span style={{ fontSize: "0.78rem", color: "var(--muted)" }}>
              No posts will go out until you resume. Manage in Settings →
            </span>
          </div>
        </Link>
      )}
      {founder.reflection_pending && <ReflectionBanner />}

      <GreetingHeader
        firstName={firstName}
        subtitle={`${todayFmt} · ${stratDaysLeft} day${stratDaysLeft === 1 ? "" : "s"} remaining till next strategy`}
        modeLabel={modeLabel}
      />

      {/* Review urgency */}
      {totalDraft > 0 && (
        <div style={{
          padding: "0.75rem 1.25rem",
          borderRadius: "var(--radius)",
          background: "rgba(251,146,60,0.06)",
          display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap",
        }}>
          <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "#fb923c" }}>
            Needs review
          </span>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            {xDraft > 0 && (
              <Link href="/dashboard/x" style={{
                fontSize: "0.78rem", color: "var(--muted)", textDecoration: "none",
                padding: "0.25rem 0.75rem", borderRadius: 6, background: "rgba(255,255,255,0.04)",
                display: "flex", alignItems: "center", gap: "0.375rem",
              }}>
                <span style={{ color: "#fb923c", fontWeight: 700 }}>{xDraft}</span> X posts →
              </Link>
            )}
            {liDraft > 0 && (
              <Link href="/dashboard/linkedin" style={{
                fontSize: "0.78rem", color: "var(--muted)", textDecoration: "none",
                padding: "0.25rem 0.75rem", borderRadius: 6, background: "rgba(255,255,255,0.04)",
                display: "flex", alignItems: "center", gap: "0.375rem",
              }}>
                <span style={{ color: "#fb923c", fontWeight: 700 }}>{liDraft}</span> LinkedIn posts →
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.875rem" }}>
        <StatCard
          label="Strategy Pulse"
          value={`${stratDaysLeft} days`}
          sub="until next strategy cycle"
          icon={
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
          }
          iconColor="#6d6bf5"
          detail={strat?.summary ? `Focus: "${strat.summary}"` : undefined}
        />
        <StatCard
          label="Posting Streak"
          value={`${totalApproved} posts`}
          sub="approved this week"
          icon={
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
          }
          iconColor="#fb923c"
          detail={totalPublished > 0 ? `${totalPublished} already published` : "Keep reviewing your drafts"}
        />
        <StatCard
          label="Content Runway"
          value={`${runwayDays} days`}
          sub="of approved content ahead"
          icon={
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
              <polyline points="16 7 22 7 22 13" />
            </svg>
          }
          iconColor="#4ade80"
          detail={runwayDays > 0
            ? `Buffered until ${Array.from(approvedFutureDates).sort().slice(-1)[0] ? fmtShortDate(Array.from(approvedFutureDates).sort().slice(-1)[0]!) : "—"}`
            : "No approved posts yet"
          }
        />
      </div>

      {/* Today's Schedule */}
      <section style={{ background: "var(--card)", borderRadius: "var(--radius)", overflow: "hidden" }}>
        <div style={{
          padding: "1.125rem 1.5rem",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          borderBottom: "1px solid var(--border)",
        }}>
          <div>
            <p style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--fg)", margin: 0 }}>Today&apos;s Schedule</p>
            <p style={{ color: "var(--muted)", fontSize: "0.75rem", marginTop: "0.2rem" }}>
              {todayFmt} · {todayPosts.length} post{todayPosts.length !== 1 ? "s" : ""} remaining
            </p>
          </div>
          <Link href="/dashboard/x" style={{
            fontSize: "0.72rem", fontWeight: 600, color: "var(--accent-fg)",
            textDecoration: "none", letterSpacing: "0.04em",
          }}>
            VIEW FULL CALENDAR →
          </Link>
        </div>

        {todayPosts.length === 0 ? (
          <div style={{ padding: "2.5rem", textAlign: "center" }}>
            <p style={{ color: "var(--muted-2)", fontSize: "0.82rem", margin: "0 0 1rem" }}>No posts scheduled for today.</p>
            <Link href="/dashboard/x" style={{
              fontSize: "0.78rem", color: "var(--muted)", textDecoration: "none",
              padding: "0.4rem 0.875rem", borderRadius: 7,
              background: "rgba(255,255,255,0.05)",
              display: "inline-flex", alignItems: "center", gap: "0.375rem",
            }}>
              + Schedule Another Post
            </Link>
          </div>
        ) : (
          <>
            <div style={{
              display: "grid",
              gridTemplateColumns: "90px 48px 1fr 110px 90px",
              padding: "0.5rem 1.5rem",
              fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.08em",
              textTransform: "uppercase", color: "var(--muted-2)",
              borderBottom: "1px solid var(--border)",
            }}>
              <span>Time</span>
              <span>Channel</span>
              <span>Content Preview</span>
              <span>Type</span>
              <span>Status</span>
            </div>
            {todayPosts.map(post => (
              <ScheduleRow key={post.id} post={post} showDate={false} />
            ))}
          </>
        )}
      </section>

      {/* Upcoming Schedule */}
      {upcomingPosts.length > 0 && (
        <section style={{ background: "var(--card)", borderRadius: "var(--radius)", overflow: "hidden" }}>
          <div style={{
            padding: "1.125rem 1.5rem",
            display: "flex", alignItems: "center", justifyContent: "space-between",
            borderBottom: "1px solid var(--border)",
          }}>
            <div>
              <p style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--fg)", margin: 0 }}>Upcoming Schedule</p>
              <p style={{ color: "var(--muted)", fontSize: "0.75rem", marginTop: "0.2rem" }}>
                Next {upcomingPosts.length} post{upcomingPosts.length !== 1 ? "s" : ""}
              </p>
            </div>
            <Link href="/dashboard/x" style={{
              fontSize: "0.72rem", fontWeight: 600, color: "var(--accent-fg)",
              textDecoration: "none", letterSpacing: "0.04em",
            }}>
              VIEW FULL CALENDAR →
            </Link>
          </div>

          <div style={{
            display: "grid",
            gridTemplateColumns: "100px 90px 48px 1fr 110px 90px",
            padding: "0.5rem 1.5rem",
            fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.08em",
            textTransform: "uppercase", color: "var(--muted-2)",
            borderBottom: "1px solid var(--border)",
          }}>
            <span>Date</span>
            <span>Time</span>
            <span>Channel</span>
            <span>Content Preview</span>
            <span>Type</span>
            <span>Status</span>
          </div>
          {upcomingPosts.map(post => (
            <ScheduleRow key={post.id} post={post} showDate={true} />
          ))}
        </section>
      )}
    </div>
  );
}

function GreetingHeader({ firstName, subtitle, modeLabel }: { firstName: string; subtitle: string; modeLabel: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
      <div>
        <h1 style={{ fontSize: "1.6rem", fontWeight: 700, letterSpacing: "-0.03em", color: "var(--fg)", margin: 0 }}>
          Hello, {firstName}!
        </h1>
        <p style={{ color: "var(--muted)", fontSize: "0.82rem", marginTop: "0.35rem" }}>
          {subtitle}
        </p>
      </div>
      <div style={{
        display: "flex", alignItems: "center", gap: "0.4rem",
        padding: "0.35rem 0.875rem", borderRadius: 999,
        background: "rgba(109,107,245,0.12)",
        fontSize: "0.72rem", fontWeight: 600, color: "var(--accent-fg)",
        letterSpacing: "0.05em", flexShrink: 0,
      }}>
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--success)", display: "inline-block" }} />
        {modeLabel} mode
      </div>
    </div>
  );
}

function StatCard({
  label, value, sub, icon, iconColor, detail,
}: {
  label: string; value: string; sub: string;
  icon: React.ReactNode; iconColor: string; detail?: string;
}) {
  return (
    <div style={{
      background: "var(--card)", borderRadius: "var(--radius)",
      padding: "1.25rem 1.5rem",
      display: "flex", flexDirection: "column", gap: "0.875rem",
      position: "relative", overflow: "hidden",
    }}>
      {/* Subtle glow */}
      <div style={{
        position: "absolute", top: -40, right: -40, width: 100, height: 100, borderRadius: "50%",
        background: `radial-gradient(circle, ${iconColor}18 0%, transparent 70%)`,
        pointerEvents: "none",
      }} />
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <div style={{
          width: 28, height: 28, borderRadius: 8, flexShrink: 0,
          background: `${iconColor}1a`,
          display: "flex", alignItems: "center", justifyContent: "center",
          color: iconColor,
        }}>
          {icon}
        </div>
        <span style={{
          fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.1em",
          textTransform: "uppercase", color: "var(--muted-2)",
        }}>
          {label}
        </span>
      </div>
      <div>
        <p style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--fg)", margin: 0, letterSpacing: "-0.03em" }}>
          {value}
        </p>
        <p style={{ fontSize: "0.72rem", color: "var(--muted)", margin: "0.25rem 0 0" }}>{sub}</p>
      </div>
      {detail && (
        <p style={{ fontSize: "0.7rem", color: "var(--muted-2)", margin: 0, lineHeight: 1.4 }}>
          {detail}
        </p>
      )}
    </div>
  );
}

function ScheduleRow({ post, showDate }: {
  post: {
    id: string; platform: string; status: string; scheduled_date: string;
    post_type: string; sort_order: number | null; content: string;
    time: string; slotOrder: number;
  };
  showDate: boolean;
}) {
  const cols = showDate
    ? "100px 90px 48px 1fr 110px 90px"
    : "90px 48px 1fr 110px 90px";

  const typeLabel =
    post.post_type === "x_short" ? "Single Post" :
    post.post_type === "x_long" ? "Long Form" :
    "Long Form";

  const statusLabel =
    post.status === "draft"     ? "Needs Review" :
    post.status === "approved"  ? "Scheduled" :
    post.status === "published" ? "Published" :
    post.status === "rejected"  ? "Rejected" :
    post.status;

  const statusBg =
    post.status === "approved" || post.status === "scheduled" ? "rgba(109,107,245,0.15)" :
    post.status === "published" ? "rgba(74,222,128,0.1)" :
    post.status === "rejected"  ? "rgba(248,113,113,0.1)" :
    "rgba(255,255,255,0.05)";

  const statusColor =
    post.status === "approved" || post.status === "scheduled" ? "#a5b4fc" :
    post.status === "published" ? "#4ade80" :
    post.status === "rejected"  ? "#f87171" :
    "var(--muted-2)";

  const platformHref = post.platform === "x" ? "/dashboard/x" : "/dashboard/linkedin";

  return (
    <Link href={platformHref} style={{ textDecoration: "none", display: "block" }}>
      <div style={{
        display: "grid",
        gridTemplateColumns: cols,
        padding: "0.75rem 1.5rem",
        alignItems: "center",
        gap: "0.75rem",
        borderBottom: "1px solid var(--border)",
        transition: "background 0.12s",
      }}
        className="sched-row"
      >
        {showDate && (
          <span style={{ fontSize: "0.78rem", color: "var(--muted)", fontVariantNumeric: "tabular-nums" }}>
            {fmtShortDate(post.scheduled_date)}
          </span>
        )}
        <span style={{ fontSize: "0.78rem", color: "var(--muted)", fontVariantNumeric: "tabular-nums" }}>
          {post.time}
        </span>
        {/* Channel icon */}
        <div style={{
          width: 28, height: 28, borderRadius: 14,
          background: post.platform === "x" ? "rgba(255,255,255,0.1)" : "#0a66c2",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          {post.platform === "x" ? (
            <svg width="11" height="11" viewBox="0 0 24 24" fill="var(--fg)">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
          ) : (
            <svg width="11" height="11" viewBox="0 0 24 24" fill="white">
              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
            </svg>
          )}
        </div>
        <span style={{
          fontSize: "0.82rem", color: "var(--fg)",
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          {post.content}
        </span>
        <span style={{
          fontSize: "0.68rem", fontWeight: 600, padding: "3px 9px",
          borderRadius: 5, background: "rgba(255,255,255,0.05)", color: "var(--muted-2)",
          whiteSpace: "nowrap",
        }}>
          {typeLabel}
        </span>
        <span style={{
          fontSize: "0.68rem", fontWeight: 600, padding: "3px 9px",
          borderRadius: 5, background: statusBg, color: statusColor,
          whiteSpace: "nowrap",
        }}>
          {statusLabel}
        </span>
      </div>
    </Link>
  );
}
