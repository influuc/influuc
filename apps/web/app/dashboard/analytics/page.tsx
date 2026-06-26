import { getCurrentFounder } from "@/lib/founder";
import { createServiceClient } from "@/lib/supabase/service";
import { redirect } from "next/navigation";

export default async function AnalyticsPage() {
  let founder;
  try {
    founder = await getCurrentFounder();
  } catch {
    redirect("/sign-in");
  }
  if (founder.onboarding_state !== "done") redirect(`/onboarding/${founder.onboarding_state}`);

  const db = createServiceClient();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();

  const [{ data: metrics }, { data: learned }, { count: publishedCount }] = await Promise.all([
    db.from("post_metrics")
      .select("post_id, platform, likes, reposts, replies, quotes, engagement, impressions, collected_at")
      .eq("founder_id", founder.id)
      .gte("collected_at", thirtyDaysAgo)
      .order("collected_at", { ascending: false }),
    db.from("brain_facts")
      .select("content, updated_at")
      .eq("founder_id", founder.id)
      .eq("source_kind", "learning")
      .eq("key", "learned_engagement_pattern")
      .eq("status", "active")
      .maybeSingle(),
    db.from("weekly_posts")
      .select("*", { count: "exact", head: true })
      .eq("founder_id", founder.id)
      .eq("status", "published"),
  ]);

  // Latest snapshot per post
  const latest = new Map<string, NonNullable<typeof metrics>[number]>();
  for (const m of metrics ?? []) if (!latest.has(m.post_id)) latest.set(m.post_id, m);
  const rows = [...latest.values()];

  const totalEngagement = rows.reduce((s, r) => s + r.engagement, 0);
  const totalLikes = rows.reduce((s, r) => s + r.likes, 0);
  const avgEngagement = rows.length ? Math.round(totalEngagement / rows.length) : 0;
  const tracked = rows.length;

  // Top posts need content
  const topIds = [...rows].sort((a, b) => b.engagement - a.engagement).slice(0, 5).map((r) => r.post_id);
  const { data: contents } = topIds.length
    ? await db.from("weekly_posts").select("id, content, platform, published_at").in("id", topIds)
    : { data: [] as { id: string; content: string; platform: string; published_at: string | null }[] };
  const contentMap = new Map((contents ?? []).map((c) => [c.id, c]));

  const topPosts = [...rows]
    .sort((a, b) => b.engagement - a.engagement)
    .slice(0, 5)
    .map((r) => ({ ...r, ...contentMap.get(r.post_id) }));

  const hasData = tracked > 0;

  return (
    <div style={{ padding: "2rem 2.5rem 4rem", maxWidth: 980, margin: "0 auto", width: "100%", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", marginBottom: "0.35rem" }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: "rgba(109,107,245,0.12)", display: "flex", alignItems: "center", justifyContent: "center", color: "#a5b4fc" }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
            </svg>
          </div>
          <h1 style={{ fontSize: "1.3rem", fontWeight: 700, letterSpacing: "-0.025em", margin: 0 }}>Analytics</h1>
        </div>
        <p style={{ color: "var(--muted)", fontSize: "0.82rem", margin: 0 }}>
          How your published content is performing. Engagement refreshes every few hours.
        </p>
      </div>

      {/* What's working — the learning insight */}
      {learned?.content && (
        <div style={{ padding: "1.125rem 1.375rem", borderRadius: "var(--radius)", background: "rgba(74,222,128,0.06)", border: "1px solid rgba(74,222,128,0.18)", display: "flex", gap: "0.875rem", alignItems: "flex-start" }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, flexShrink: 0, background: "rgba(74,222,128,0.12)", display: "flex", alignItems: "center", justifyContent: "center", color: "#4ade80" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.3 1 2.3h6c0-1 .4-1.8 1-2.3A7 7 0 0 0 12 2z" /></svg>
          </div>
          <div>
            <p style={{ margin: 0, fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#4ade80" }}>What&apos;s working for you</p>
            <p style={{ margin: "0.3rem 0 0", fontSize: "0.88rem", color: "var(--fg)", lineHeight: 1.55 }}>{learned.content}</p>
          </div>
        </div>
      )}

      {/* Stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.875rem" }}>
        <Stat label="Published" value={String(publishedCount ?? 0)} sub="all time" color="#a5b4fc" />
        <Stat label="Tracked" value={String(tracked)} sub="last 30 days" color="#6d6bf5" />
        <Stat label="Total engagement" value={totalEngagement.toLocaleString()} sub={`${totalLikes.toLocaleString()} likes`} color="#4ade80" />
        <Stat label="Avg / post" value={String(avgEngagement)} sub="engagement" color="#fb923c" />
      </div>

      {/* Top posts */}
      <section style={{ background: "var(--card)", borderRadius: "var(--radius)", overflow: "hidden" }}>
        <div style={{ padding: "1.125rem 1.5rem", borderBottom: "1px solid var(--border)" }}>
          <p style={{ fontWeight: 700, fontSize: "0.95rem", margin: 0 }}>Top performing posts</p>
          <p style={{ color: "var(--muted)", fontSize: "0.75rem", marginTop: "0.2rem" }}>Ranked by total engagement, last 30 days</p>
        </div>

        {!hasData ? (
          <div style={{ padding: "3rem 2rem", textAlign: "center" }}>
            <p style={{ color: "var(--fg)", fontWeight: 600, fontSize: "0.9rem", margin: "0 0 0.4rem" }}>No engagement data yet</p>
            <p style={{ color: "var(--muted)", fontSize: "0.8rem", margin: 0, maxWidth: 380, marginInline: "auto", lineHeight: 1.55 }}>
              Once your posts go live, engagement is collected automatically every few hours and your top performers show up here.
            </p>
          </div>
        ) : (
          topPosts.map((p, i) => (
            <div key={p.post_id} style={{ display: "grid", gridTemplateColumns: "28px 1fr auto", gap: "1rem", alignItems: "center", padding: "1rem 1.5rem", borderBottom: "1px solid var(--border)" }}>
              <span style={{ fontSize: "0.95rem", fontWeight: 700, color: i === 0 ? "#4ade80" : "var(--muted-2)", fontVariantNumeric: "tabular-nums" }}>{i + 1}</span>
              <p style={{ margin: 0, fontSize: "0.82rem", color: "var(--fg)", lineHeight: 1.5, overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                {p.content ?? "(post)"}
              </p>
              <div style={{ display: "flex", gap: "0.875rem", flexShrink: 0, fontVariantNumeric: "tabular-nums" }}>
                <Metric icon="♥" value={p.likes} color="#f87171" />
                <Metric icon="↻" value={p.reposts} color="#4ade80" />
                <Metric icon="💬" value={p.replies} color="#a5b4fc" />
              </div>
            </div>
          ))
        )}
      </section>
    </div>
  );
}

function Stat({ label, value, sub, color }: { label: string; value: string; sub: string; color: string }) {
  return (
    <div style={{ background: "var(--card)", borderRadius: "var(--radius)", padding: "1.1rem 1.25rem", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: -30, right: -30, width: 80, height: 80, borderRadius: "50%", background: `radial-gradient(circle, ${color}18 0%, transparent 70%)`, pointerEvents: "none" }} />
      <p style={{ fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--muted-2)", margin: 0 }}>{label}</p>
      <p style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--fg)", margin: "0.4rem 0 0", letterSpacing: "-0.02em" }}>{value}</p>
      <p style={{ fontSize: "0.7rem", color: "var(--muted)", margin: "0.15rem 0 0" }}>{sub}</p>
    </div>
  );
}

function Metric({ icon, value, color }: { icon: string; value: number; color: string }) {
  return (
    <span style={{ display: "flex", alignItems: "center", gap: "0.25rem", fontSize: "0.78rem", color: "var(--muted)" }}>
      <span style={{ color }}>{icon}</span>{value}
    </span>
  );
}
