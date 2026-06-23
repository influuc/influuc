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
    .eq("platform", "x")
    .order("scheduled_date")
    .order("sort_order");

  const byDay = groupByDay(posts ?? []);
  const approved = (posts ?? []).filter(p => p.status === "approved").length;
  const total = (posts ?? []).length;

  const strat = strategy.strategy as { summary?: string };

  return (
    <div style={{
      flex: 1,
      display: "flex",
      flexDirection: "column",
      padding: "2rem 1.5rem 4rem",
      maxWidth: "960px",
      margin: "0 auto",
      width: "100%",
      gap: "2rem",
    }}>
      {/* Page header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: "0.75rem" }}>
        <div>
          <h1 style={{ fontSize: "1.6rem", fontWeight: 700, margin: 0 }}>X Schedule</h1>
          <p style={{ color: "var(--muted)", fontSize: "0.875rem", margin: "0.3rem 0 0" }}>
            Week of {fmt(strategy.week_start)} · {approved}/{total} approved
          </p>
          {strat.summary && (
            <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.82rem", margin: "0.25rem 0 0", fontStyle: "italic" }}>
              &ldquo;{strat.summary}&rdquo;
            </p>
          )}
        </div>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <ApproveAllBtn total={total} approved={approved} />
        </div>
      </div>

      {/* Days */}
      {byDay.map(({ date, shorts, longs }) => (
        <section key={date}>
          <h2 style={{
            fontSize: "0.78rem",
            fontWeight: 700,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "var(--muted)",
            margin: "0 0 0.75rem",
            paddingBottom: "0.5rem",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
          }}>
            {fmtDay(date)}
          </h2>

          {/* Short posts — 2 col grid */}
          {shorts.length > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "0.75rem" }}>
              {shorts.map(p => (
                <PostCard
                  key={p.id}
                  id={p.id}
                  content={p.content}
                  postType="x_short"
                  initialStatus={p.status as "draft" | "approved" | "rejected"}
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
              initialStatus={p.status as "draft" | "approved" | "rejected"}
            />
          ))}
        </section>
      ))}
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

function ApproveAllBtn({ total, approved }: { total: number; approved: number }) {
  if (approved === total && total > 0) {
    return (
      <span style={{ fontSize: "0.8rem", color: "#4ade80", fontWeight: 600 }}>
        ✓ All {total} posts approved
      </span>
    );
  }
  return null;
}
