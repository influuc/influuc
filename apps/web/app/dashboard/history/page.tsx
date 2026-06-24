import { getCurrentFounder } from "@/lib/founder";
import { createServiceClient } from "@/lib/supabase/service";
import { redirect } from "next/navigation";

function fmt(d: string) {
  return new Date(d + "T00:00:00Z").toLocaleDateString("en-US", {
    weekday: "long", month: "short", day: "numeric", timeZone: "UTC",
  });
}

function fmtWeek(d: string) {
  return new Date(d + "T00:00:00Z").toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric", timeZone: "UTC",
  });
}

const PLATFORM_LABEL: Record<string, string> = { x: "X", linkedin: "LinkedIn" };
const PLATFORM_COLOR: Record<string, string> = {
  x: "rgba(255,255,255,0.08)",
  linkedin: "rgba(0,127,255,0.08)",
};

export default async function HistoryPage() {
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

  const { data: posts } = await db
    .from("weekly_posts")
    .select("id, platform, post_type, content, status, scheduled_date, published_at, week_start")
    .eq("founder_id", founder.id)
    .in("status", ["published", "scheduled"])
    .order("published_at", { ascending: false })
    .limit(200);

  const allPosts = posts ?? [];

  // Group by week_start
  const byWeek = new Map<string, typeof allPosts>();
  for (const p of allPosts) {
    const key = p.week_start ?? p.scheduled_date.slice(0, 10);
    if (!byWeek.has(key)) byWeek.set(key, []);
    byWeek.get(key)!.push(p);
  }

  const weeks = Array.from(byWeek.entries()).sort(([a], [b]) => b.localeCompare(a));

  return (
    <div style={{
      padding: "2rem 2.5rem 4rem",
      maxWidth: 860,
      margin: "0 auto",
      width: "100%",
      display: "flex",
      flexDirection: "column",
      gap: "2rem",
    }}>
      <div>
        <h1 style={{ fontSize: "1.4rem", fontWeight: 700, letterSpacing: "-0.025em", margin: 0 }}>
          Post History
        </h1>
        <p style={{ color: "var(--muted)", fontSize: "0.82rem", marginTop: "0.3rem" }}>
          {allPosts.length} published post{allPosts.length !== 1 ? "s" : ""} across all platforms
        </p>
      </div>

      {allPosts.length === 0 && (
        <div style={{
          padding: "4rem 2rem",
          textAlign: "center",
          background: "var(--card)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius)",
        }}>
          <p style={{ color: "var(--muted)", fontSize: "0.875rem", lineHeight: 1.6, margin: 0 }}>
            No published posts yet. Once your posts go live, they will appear here.
          </p>
        </div>
      )}

      {weeks.map(([weekStart, weekPosts]) => {
        const xCount = weekPosts.filter(p => p.platform === "x").length;
        const liCount = weekPosts.filter(p => p.platform === "linkedin").length;
        return (
          <section key={weekStart} style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
            {/* Week header */}
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
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
                Week of {fmtWeek(weekStart)}
              </h2>
              <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                {xCount > 0 && (
                  <span style={{ fontSize: "0.7rem", color: "var(--muted-2)", padding: "2px 7px", borderRadius: 4, background: "rgba(255,255,255,0.05)", border: "1px solid var(--border)" }}>
                    {xCount} X
                  </span>
                )}
                {liCount > 0 && (
                  <span style={{ fontSize: "0.7rem", color: "var(--muted-2)", padding: "2px 7px", borderRadius: 4, background: "rgba(255,255,255,0.05)", border: "1px solid var(--border)" }}>
                    {liCount} LinkedIn
                  </span>
                )}
              </div>
            </div>

            {/* Posts in week */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
              {weekPosts.map(post => (
                <div key={post.id} style={{
                  display: "flex",
                  gap: "1rem",
                  padding: "0.875rem 1rem",
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: 10,
                  alignItems: "flex-start",
                }}>
                  {/* Platform badge */}
                  <span style={{
                    fontSize: "0.65rem",
                    fontWeight: 700,
                    padding: "3px 8px",
                    borderRadius: 5,
                    background: PLATFORM_COLOR[post.platform] ?? "rgba(255,255,255,0.05)",
                    border: "1px solid var(--border)",
                    color: "var(--muted-2)",
                    flexShrink: 0,
                    alignSelf: "flex-start",
                    marginTop: 2,
                    letterSpacing: "0.04em",
                  }}>
                    {PLATFORM_LABEL[post.platform] ?? post.platform}
                  </span>

                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{
                      fontSize: "0.875rem",
                      color: "var(--fg)",
                      margin: 0,
                      lineHeight: 1.65,
                      display: "-webkit-box",
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                      whiteSpace: "pre-wrap",
                    }}>
                      {post.content}
                    </p>
                  </div>

                  {/* Date */}
                  <div style={{ flexShrink: 0, textAlign: "right" }}>
                    <p style={{ fontSize: "0.7rem", color: "var(--muted-2)", margin: 0 }}>
                      {fmt(post.scheduled_date)}
                    </p>
                    {post.status === "scheduled" && (
                      <p style={{ fontSize: "0.65rem", color: "var(--accent-fg)", margin: "0.2rem 0 0", fontWeight: 500 }}>Queued</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
