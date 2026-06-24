import { getCurrentFounder } from "@/lib/founder";
import { createServiceClient } from "@/lib/supabase/service";
import { redirect } from "next/navigation";
import { PostCard } from "../post-card";
import { ApproveAllBtn } from "../approve-all-btn";

export default async function LinkedInSchedulePage() {
  let founder;
  try {
    founder = await getCurrentFounder();
  } catch {
    redirect("/sign-in");
  }

  if (founder.onboarding_state !== "done") {
    redirect(`/onboarding/${founder.onboarding_state}`);
  }

  const db = createServiceClient();

  const [{ data: strategy }, { data: prefs }] = await Promise.all([
    db
      .from("weekly_strategies")
      .select("id, week_start, strategy")
      .eq("founder_id", founder.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single(),
    db
      .from("operating_preferences")
      .select("mode")
      .eq("founder_id", founder.id)
      .single(),
  ]);

  if (!strategy) {
    return (
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "4rem 2rem" }}>
        <p style={{ color: "var(--muted)", fontSize: "0.875rem", textAlign: "center", maxWidth: 360, lineHeight: 1.6 }}>
          No content generated yet. Complete onboarding to generate your first week.
        </p>
      </div>
    );
  }

  const { data: posts } = await db
    .from("weekly_posts")
    .select("*")
    .eq("founder_id", founder.id)
    .eq("strategy_id", strategy.id)
    .eq("platform", "linkedin")
    .order("scheduled_date");

  const allPosts = posts ?? [];
  const approved = allPosts.filter(p => p.status === "approved" || p.status === "published").length;
  const draftCount = allPosts.filter(p => p.status === "draft").length;
  const total = allPosts.length;

  const strat = strategy.strategy as { summary?: string; ideas?: Array<{ date: string; theme: string }> };
  const ideaByDate = new Map((strat.ideas ?? []).map(i => [i.date, i.theme]));
  const mode = prefs?.mode ?? "manual";
  const isAutomatic = mode === "assisted";

  return (
    <div style={{
      padding: "2rem 2.5rem 4rem",
      maxWidth: 800,
      margin: "0 auto",
      width: "100%",
      display: "flex",
      flexDirection: "column",
      gap: "2rem",
    }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h1 style={{ fontSize: "1.4rem", fontWeight: 700, letterSpacing: "-0.025em", margin: 0 }}>LinkedIn</h1>
          <p style={{ color: "var(--muted)", fontSize: "0.82rem", marginTop: "0.3rem" }}>
            Week of {fmt(strategy.week_start)}
            {strat.summary && <> · <span style={{ fontStyle: "italic" }}>{strat.summary}</span></>}
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexShrink: 0 }}>
          {isAutomatic && draftCount > 0 && (
            <ApproveAllBtn
              strategyId={strategy.id}
              platform="linkedin"
              draftCount={draftCount}
            />
          )}
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "0.625rem",
            padding: "0.4rem 0.875rem",
            borderRadius: 999,
            background: approved === total && total > 0 ? "var(--success-bg)" : "var(--card)",
            border: `1px solid ${approved === total && total > 0 ? "rgba(74,222,128,0.2)" : "var(--border)"}`,
          }}>
            <span style={{ fontSize: "0.8rem", fontWeight: 600, color: approved === total && total > 0 ? "var(--success)" : "var(--fg)" }}>
              {approved}/{total}
            </span>
            <span style={{ fontSize: "0.75rem", color: "var(--muted)" }}>approved</span>
            {approved === total && total > 0 && <span style={{ fontSize: "0.75rem", color: "var(--success)" }}>✓</span>}
          </div>
        </div>
      </div>

      {/* Schedule info banner */}
      <div style={{
        padding: "0.75rem 1rem",
        borderRadius: 10,
        background: "rgba(109,107,245,0.06)",
        border: "1px solid rgba(109,107,245,0.12)",
        display: "flex",
        alignItems: "center",
        gap: "0.625rem",
      }}>
        <span style={{
          fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.06em",
          textTransform: "uppercase", color: "var(--muted-2)",
          padding: "2px 6px", borderRadius: 4,
          background: "rgba(255,255,255,0.05)", border: "1px solid var(--border)",
        }}>
          1 per day
        </span>
        <span style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--accent-fg)" }}>9:30 AM IST</span>
        <span style={{ fontSize: "0.75rem", color: "var(--muted-2)", marginLeft: "auto" }}>
          Daily posting schedule
        </span>
      </div>

      {/* Posts */}
      {allPosts.map(post => (
        <section key={post.id} style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <div style={{
            display: "flex",
            flexDirection: "column",
            gap: "0.25rem",
            paddingBottom: "0.625rem",
            borderBottom: "1px solid var(--border)",
          }}>
            <h2 style={{
              fontSize: "0.75rem",
              fontWeight: 600,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: "var(--muted-2)",
              margin: 0,
            }}>
              {fmtDay(post.scheduled_date)}
            </h2>
            {ideaByDate.has(post.scheduled_date) && (
              <p style={{ fontSize: "0.8rem", color: "var(--accent-fg)", margin: 0, fontWeight: 500 }}>
                {ideaByDate.get(post.scheduled_date)}
              </p>
            )}
          </div>

          <PostCard
            id={post.id}
            content={post.content}
            postType="linkedin"
            initialStatus={post.status as "draft" | "approved" | "rejected" | "published" | "scheduled" | "failed"}
            scheduledDate={post.scheduled_date}
          />
        </section>
      ))}
    </div>
  );
}

function fmt(d: string) {
  return new Date(d + "T00:00:00Z").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
}

function fmtDay(d: string) {
  return new Date(d + "T00:00:00Z").toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric", timeZone: "UTC" });
}
