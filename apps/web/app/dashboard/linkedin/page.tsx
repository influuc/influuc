import { getCurrentFounder } from "@/lib/founder";
import { createServiceClient } from "@/lib/supabase/service";
import { redirect } from "next/navigation";
import { PostCard } from "../post-card";

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

  const { data: strategy } = await db
    .from("weekly_strategies")
    .select("id, week_start, strategy")
    .eq("founder_id", founder.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (!strategy) {
    return (
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted)" }}>
        <p>No content generated yet. Complete onboarding to generate your first week.</p>
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

  const approved = (posts ?? []).filter(p => p.status === "approved").length;
  const total = (posts ?? []).length;

  const strat = strategy.strategy as { summary?: string; ideas?: Array<{ date: string; theme: string }> };

  const ideaByDate = new Map((strat.ideas ?? []).map(i => [i.date, i.theme]));

  return (
    <div style={{
      flex: 1,
      display: "flex",
      flexDirection: "column",
      padding: "2rem 1.5rem 4rem",
      maxWidth: "780px",
      margin: "0 auto",
      width: "100%",
      gap: "2rem",
    }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: "1.6rem", fontWeight: 700, margin: 0 }}>LinkedIn Schedule</h1>
        <p style={{ color: "var(--muted)", fontSize: "0.875rem", margin: "0.3rem 0 0" }}>
          Week of {fmt(strategy.week_start)} · {approved}/{total} approved · 2000+ chars each
        </p>
        {strat.summary && (
          <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.82rem", margin: "0.25rem 0 0", fontStyle: "italic" }}>
            &ldquo;{strat.summary}&rdquo;
          </p>
        )}
      </div>

      {/* One post per day */}
      {(posts ?? []).map(post => (
        <section key={post.id}>
          <div style={{ marginBottom: "0.75rem" }}>
            <h2 style={{
              fontSize: "0.78rem",
              fontWeight: 700,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "var(--muted)",
              margin: "0 0 0.25rem",
              paddingBottom: "0.5rem",
              borderBottom: "1px solid rgba(255,255,255,0.06)",
            }}>
              {fmtDay(post.scheduled_date)}
            </h2>
            {ideaByDate.has(post.scheduled_date) && (
              <p style={{ fontSize: "0.78rem", color: "rgba(109,107,245,0.8)", margin: 0, fontWeight: 500 }}>
                {ideaByDate.get(post.scheduled_date)}
              </p>
            )}
          </div>

          <PostCard
            id={post.id}
            content={post.content}
            postType="linkedin"
            initialStatus={post.status as "draft" | "approved" | "rejected"}
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
