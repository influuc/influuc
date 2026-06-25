import { getCurrentFounder } from "@/lib/founder";
import { createServiceClient } from "@/lib/supabase/service";
import { redirect } from "next/navigation";

function fmtDay(d: string) {
  return new Date(d + "T00:00:00Z").toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric", timeZone: "UTC",
  });
}

function fmtWeek(d: string) {
  const start = new Date(d + "T00:00:00Z");
  const end   = new Date(d + "T00:00:00Z");
  end.setUTCDate(end.getUTCDate() + 6);
  return `${start.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })} – ${end.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })}`;
}

function XIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function LinkedInIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}

function PlatformBadge({ platform }: { platform: string }) {
  const isX = platform === "x";
  return (
    <div style={{
      width: 34, height: 34, borderRadius: 9, flexShrink: 0,
      display: "flex", alignItems: "center", justifyContent: "center",
      background: isX ? "rgba(255,255,255,0.08)" : "rgba(10,102,194,0.15)",
      border: `1px solid ${isX ? "rgba(255,255,255,0.1)" : "rgba(10,102,194,0.25)"}`,
      color: isX ? "var(--fg)" : "#60a5fa",
    }}>
      {isX ? <XIcon /> : <LinkedInIcon />}
    </div>
  );
}

function StatChip({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <div style={{
      padding: "0.75rem 1.125rem",
      background: "var(--card)",
      borderRadius: "var(--radius)",
      display: "flex", flexDirection: "column", gap: "0.15rem",
    }}>
      <span style={{ fontSize: "1.4rem", fontWeight: 800, color, letterSpacing: "-0.03em", lineHeight: 1 }}>
        {value}
      </span>
      <span style={{ fontSize: "0.7rem", color: "var(--muted)" }}>{label}</span>
    </div>
  );
}

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
    .order("scheduled_date", { ascending: false })
    .limit(200);

  const allPosts = posts ?? [];
  const xTotal   = allPosts.filter(p => p.platform === "x").length;
  const liTotal  = allPosts.filter(p => p.platform === "linkedin").length;

  const byWeek = new Map<string, typeof allPosts>();
  for (const p of allPosts) {
    const key = p.week_start ?? p.scheduled_date.slice(0, 10);
    if (!byWeek.has(key)) byWeek.set(key, []);
    byWeek.get(key)!.push(p);
  }
  const weeks = Array.from(byWeek.entries()).sort(([a], [b]) => b.localeCompare(a));

  return (
    <div style={{
      padding: "2.5rem 2.5rem 5rem",
      maxWidth: 900,
      margin: "0 auto",
      width: "100%",
      display: "flex",
      flexDirection: "column",
      gap: "1.75rem",
    }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: "1rem" }}>
        <div style={{
          width: 48, height: 48, borderRadius: 14, flexShrink: 0,
          background: "linear-gradient(135deg, rgba(109,107,245,0.2) 0%, rgba(96,165,250,0.2) 100%)",
          border: "1px solid rgba(109,107,245,0.25)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#a5b4fc" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        </div>
        <div>
          <h1 style={{ fontSize: "1.65rem", fontWeight: 800, letterSpacing: "-0.03em", margin: 0, color: "var(--fg)" }}>
            Post History
          </h1>
          <p style={{ color: "var(--muted)", fontSize: "0.85rem", marginTop: "0.25rem" }}>
            {allPosts.length > 0 ? `${allPosts.length} posts published across all platforms` : "No posts published yet"}
          </p>
        </div>
      </div>

      {/* Stats */}
      {allPosts.length > 0 && (
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          <StatChip value={allPosts.length} label="Total posts"   color="#a5b4fc" />
          <StatChip value={xTotal}          label="X posts"       color="var(--fg)" />
          <StatChip value={liTotal}         label="LinkedIn posts" color="#60a5fa" />
        </div>
      )}

      {/* Empty state */}
      {allPosts.length === 0 && (
        <div style={{
          padding: "4rem 2rem", textAlign: "center",
          background: "var(--card)", borderRadius: 14, border: "1px solid var(--border)",
        }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16,
            background: "rgba(109,107,245,0.1)", border: "1px solid rgba(109,107,245,0.2)",
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 1.25rem",
          }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#a5b4fc" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <p style={{ fontSize: "1rem", fontWeight: 600, color: "var(--fg)", margin: "0 0 0.5rem" }}>
            No posts published yet
          </p>
          <p style={{ color: "var(--muted)", fontSize: "0.82rem", lineHeight: 1.6, margin: "0 auto", maxWidth: 340 }}>
            Once your posts go live they&apos;ll appear here, organised by week.
          </p>
        </div>
      )}

      {/* Weeks */}
      {weeks.map(([weekStart, weekPosts]) => {
        const wX  = weekPosts.filter(p => p.platform === "x").length;
        const wLi = weekPosts.filter(p => p.platform === "linkedin").length;

        return (
          <section key={weekStart}>
            {/* Week header */}
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              marginBottom: "0.875rem", gap: "1rem",
            }}>
              <h2 style={{
                fontSize: "0.78rem", fontWeight: 700, letterSpacing: "0.04em",
                textTransform: "uppercase", color: "var(--muted-2)", margin: 0,
              }}>
                Week of {fmtWeek(weekStart)}
              </h2>
              <div style={{ display: "flex", gap: "0.375rem", alignItems: "center", flexShrink: 0 }}>
                {wX > 0 && (
                  <span style={{
                    display: "flex", alignItems: "center", gap: "0.3rem",
                    fontSize: "0.68rem", fontWeight: 600, color: "var(--muted-2)",
                    padding: "2px 8px", borderRadius: 99,
                    background: "rgba(255,255,255,0.05)", border: "1px solid var(--border)",
                  }}>
                    <XIcon /> {wX}
                  </span>
                )}
                {wLi > 0 && (
                  <span style={{
                    display: "flex", alignItems: "center", gap: "0.3rem",
                    fontSize: "0.68rem", fontWeight: 600, color: "#60a5fa",
                    padding: "2px 8px", borderRadius: 99,
                    background: "rgba(10,102,194,0.1)", border: "1px solid rgba(10,102,194,0.2)",
                  }}>
                    <LinkedInIcon /> {wLi}
                  </span>
                )}
              </div>
            </div>

            {/* Posts */}
            <div style={{
              display: "flex", flexDirection: "column",
              background: "var(--card)",
              borderRadius: "var(--radius)", overflow: "hidden",
            }}>
              {weekPosts.map((post, i) => (
                <div key={post.id} style={{
                  display: "flex", gap: "1rem", alignItems: "flex-start",
                  padding: "1rem 1.25rem",
                  borderBottom: i < weekPosts.length - 1 ? "1px solid var(--border)" : "none",
                }}>
                  <PlatformBadge platform={post.platform} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{
                      fontSize: "0.875rem", color: "var(--fg)", margin: 0,
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
                  <div style={{ flexShrink: 0, textAlign: "right", minWidth: 90 }}>
                    <p style={{ fontSize: "0.72rem", color: "var(--muted-2)", margin: 0, whiteSpace: "nowrap" }}>
                      {fmtDay(post.scheduled_date)}
                    </p>
                    {post.status === "scheduled" && (
                      <span style={{
                        display: "inline-block", marginTop: "0.25rem",
                        fontSize: "0.62rem", fontWeight: 600,
                        padding: "1px 7px", borderRadius: 99,
                        background: "rgba(109,107,245,0.15)", color: "var(--accent-fg)",
                        border: "1px solid rgba(109,107,245,0.25)",
                      }}>
                        Queued
                      </span>
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
