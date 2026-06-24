import { getCurrentFounder } from "@/lib/founder";
import { createServiceClient } from "@/lib/supabase/service";
import { redirect } from "next/navigation";
import { PostCard } from "../post-card";

export default async function XSchedulePage() {
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
      <EmptyState message="No content generated yet. Complete onboarding to generate your first week." />
    );
  }

  const { data: posts } = await db
    .from("weekly_posts")
    .select("*")
    .eq("founder_id", founder.id)
    .eq("strategy_id", strategy.id)
    .eq("platform", "x")
    .order("scheduled_date")
    .order("sort_order");

  const byDay = groupByDay(posts ?? []);
  const approved = (posts ?? []).filter(p => p.status === "approved" || p.status === "published").length;
  const total = (posts ?? []).length;
  const pct = total > 0 ? Math.round((approved / total) * 100) : 0;

  const strat = strategy.strategy as { summary?: string };

  return (
    <div style={{
      padding: "2rem 2.5rem 4rem",
      maxWidth: 1000,
      margin: "0 auto",
      width: "100%",
      display: "flex",
      flexDirection: "column",
      gap: "2rem",
    }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h1 style={{ fontSize: "1.4rem", fontWeight: 700, letterSpacing: "-0.025em", margin: 0 }}>X Posts</h1>
          <p style={{ color: "var(--muted)", fontSize: "0.82rem", marginTop: "0.3rem" }}>
            Week of {fmt(strategy.week_start)}
            {strat.summary && <> · <span style={{ fontStyle: "italic" }}>{strat.summary}</span></>}
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexShrink: 0 }}>
          <ProgressPill approved={approved} total={total} pct={pct} />
        </div>
      </div>

      {/* Days */}
      {byDay.map(({ date, shorts, longs }) => (
        <section key={date} style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
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
              {fmtDay(date)}
            </h2>
          </div>

          {/* Short posts — 2 col */}
          {shorts.length > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
              {shorts.map(p => (
                <PostCard
                  key={p.id}
                  id={p.id}
                  content={p.content}
                  postType="x_short"
                  initialStatus={p.status as "draft" | "approved" | "rejected" | "published" | "scheduled" | "failed"}
                  sortOrder={p.sort_order}
                />
              ))}
            </div>
          )}

          {/* Long post — full width */}
          {longs.map(p => (
            <PostCard
              key={p.id}
              id={p.id}
              content={p.content}
              postType="x_long"
              initialStatus={p.status as "draft" | "approved" | "rejected" | "published" | "scheduled" | "failed"}
            />
          ))}
        </section>
      ))}
    </div>
  );
}

function ProgressPill({ approved, total, pct }: { approved: number; total: number; pct: number }) {
  const allDone = total > 0 && approved === total;
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: "0.625rem",
      padding: "0.4rem 0.875rem",
      borderRadius: 999,
      background: allDone ? "var(--success-bg)" : "var(--card)",
      border: `1px solid ${allDone ? "rgba(74,222,128,0.2)" : "var(--border)"}`,
    }}>
      <span style={{ fontSize: "0.8rem", fontWeight: 600, color: allDone ? "var(--success)" : "var(--fg)" }}>
        {approved}/{total}
      </span>
      <span style={{ fontSize: "0.75rem", color: "var(--muted)" }}>approved</span>
      {allDone && <span style={{ fontSize: "0.75rem", color: "var(--success)" }}>✓</span>}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div style={{
      flex: 1,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "4rem 2rem",
    }}>
      <p style={{ color: "var(--muted)", fontSize: "0.875rem", textAlign: "center", maxWidth: 360, lineHeight: 1.6 }}>
        {message}
      </p>
    </div>
  );
}

function groupByDay(posts: { scheduled_date: string; post_type: string; sort_order: number; id: string; content: string; status: string }[]) {
  const map = new Map<string, { shorts: typeof posts; longs: typeof posts }>();
  for (const p of posts) {
    if (!map.has(p.scheduled_date)) map.set(p.scheduled_date, { shorts: [], longs: [] });
    if (p.post_type === "x_short") map.get(p.scheduled_date)!.shorts.push(p);
    else map.get(p.scheduled_date)!.longs.push(p);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, groups]) => ({ date, ...groups }));
}

function fmt(d: string) {
  return new Date(d + "T00:00:00Z").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
}

function fmtDay(d: string) {
  return new Date(d + "T00:00:00Z").toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric", timeZone: "UTC" });
}
