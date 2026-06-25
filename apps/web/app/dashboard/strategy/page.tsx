import { getCurrentFounder } from "@/lib/founder";
import { createServiceClient } from "@/lib/supabase/service";
import { redirect } from "next/navigation";
import Link from "next/link";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function fmtDate(d: string) {
  return new Date(d + "T00:00:00Z").toLocaleDateString("en-US", {
    month: "short", day: "numeric", timeZone: "UTC",
  });
}

function fmtWeek(weekStart: string) {
  const start = new Date(weekStart + "T00:00:00Z");
  const end   = new Date(weekStart + "T00:00:00Z");
  end.setUTCDate(end.getUTCDate() + 6);
  return `${start.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })} – ${end.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })}`;
}

interface StrategyIdea {
  day: number;
  date: string;
  theme: string;
  hook: string;
  talking_points: string[];
}

interface WeeklyStrategy {
  week_of?: string;
  summary?: string;
  ideas?: StrategyIdea[];
}

export default async function StrategyPage() {
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
  const { data: strategies } = await db
    .from("weekly_strategies")
    .select("id, week_start, strategy, created_at")
    .eq("founder_id", founder.id)
    .order("week_start", { ascending: false })
    .limit(4);

  const all     = strategies ?? [];
  const current = all[0] ?? null;

  if (!current) {
    return (
      <div style={{ padding: "2rem 2.5rem 5rem", maxWidth: 1100, margin: "0 auto", width: "100%" }}>
        <h1 style={{ fontSize: "1.6rem", fontWeight: 700, letterSpacing: "-0.025em", margin: "0 0 1rem" }}>
          Weekly Strategy
        </h1>
        <div style={{ padding: "4rem 2rem", textAlign: "center", background: "var(--card)", borderRadius: "var(--radius)" }}>
          <p style={{ color: "var(--fg)", fontWeight: 600, margin: "0 0 0.5rem" }}>No strategy yet</p>
          <p style={{ color: "var(--muted)", fontSize: "0.82rem", lineHeight: 1.6, margin: 0 }}>
            Your weekly strategy will appear here once generated — usually after onboarding.
          </p>
        </div>
      </div>
    );
  }

  const strat  = current.strategy as WeeklyStrategy | null;
  const ideas: StrategyIdea[] = strat?.ideas ?? [];
  const todayStr = new Date().toISOString().slice(0, 10);

  return (
    <div style={{
      padding: "2rem 2.5rem 5rem",
      maxWidth: 1100,
      margin: "0 auto",
      width: "100%",
      display: "flex",
      flexDirection: "column",
      gap: "1.5rem",
    }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h1 style={{ fontSize: "1.6rem", fontWeight: 700, letterSpacing: "-0.025em", margin: 0, color: "var(--fg)" }}>
            Weekly Strategy
          </h1>
          <p style={{ color: "var(--muted)", fontSize: "0.82rem", marginTop: "0.35rem" }}>
            {fmtWeek(current.week_start)}
          </p>
        </div>

        {/* Review buttons — same style as dashboard action links */}
        <div style={{ display: "flex", gap: "0.5rem", flexShrink: 0 }}>
          <Link href="/dashboard/x" style={{
            display: "flex", alignItems: "center", gap: "0.5rem",
            fontSize: "0.78rem", fontWeight: 600, color: "var(--fg)", textDecoration: "none",
            padding: "0.45rem 0.875rem", borderRadius: 8,
            background: "rgba(255,255,255,0.07)",
          }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
            Review posts
          </Link>
          <Link href="/dashboard/linkedin" style={{
            display: "flex", alignItems: "center", gap: "0.5rem",
            fontSize: "0.78rem", fontWeight: 600, color: "#60a5fa", textDecoration: "none",
            padding: "0.45rem 0.875rem", borderRadius: 8,
            background: "rgba(10,102,194,0.12)",
          }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
            </svg>
            Review posts
          </Link>
        </div>
      </div>

      {/* Week theme summary — left accent bar, same as dashboard uses for orange banner */}
      {strat?.summary && (
        <div style={{
          padding: "1.125rem 1.5rem",
          background: "var(--card)",
          borderRadius: "var(--radius)",
          borderLeft: "3px solid rgba(109,107,245,0.5)",
        }}>
          <p style={{
            fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.1em",
            textTransform: "uppercase", color: "var(--accent-fg)", margin: "0 0 0.5rem",
          }}>
            This week&apos;s theme
          </p>
          <p style={{ fontSize: "0.95rem", color: "var(--fg)", lineHeight: 1.6, margin: 0, fontWeight: 500 }}>
            {strat.summary}
          </p>
        </div>
      )}

      {/* Day entries — ONE card, flat rows inside, no individual boxes */}
      {ideas.length > 0 && (
        <section style={{ background: "var(--card)", borderRadius: "var(--radius)", overflow: "hidden" }}>
          {/* Column header row */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "72px 1fr",
            padding: "0.5rem 1.5rem",
            fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.1em",
            textTransform: "uppercase", color: "var(--muted-2)",
            borderBottom: "1px solid var(--border)",
          }}>
            <span>Day</span>
            <span>Content Plan</span>
          </div>

          {ideas.map((idea, i) => {
            const isPast  = idea.date < todayStr;
            const isToday = idea.date === todayStr;
            const dayLabel = DAYS[i] ?? `Day ${idea.day}`;

            return (
              <div key={idea.date} style={{
                display: "grid",
                gridTemplateColumns: "72px 1fr",
                borderBottom: i < ideas.length - 1 ? "1px solid var(--border)" : "none",
                background: isToday ? "rgba(109,107,245,0.06)" : "transparent",
                borderLeft: isToday ? "3px solid rgba(109,107,245,0.5)" : "3px solid transparent",
                opacity: isPast ? 0.55 : 1,
              }}>
                {/* Day label column */}
                <div style={{
                  padding: "1.25rem 0.75rem 1.25rem 1.25rem",
                  display: "flex", flexDirection: "column",
                  alignItems: "flex-start", justifyContent: "flex-start", gap: "0.2rem",
                  borderRight: "1px solid var(--border)",
                }}>
                  <span style={{
                    fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.05em",
                    textTransform: "uppercase",
                    color: isToday ? "var(--accent-fg)" : "var(--muted)",
                  }}>
                    {dayLabel}
                  </span>
                  <span style={{ fontSize: "0.68rem", color: "var(--muted-2)" }}>
                    {fmtDate(idea.date)}
                  </span>
                  {isToday && (
                    <span style={{
                      fontSize: "0.55rem", padding: "1px 6px", borderRadius: 99, marginTop: "0.15rem",
                      background: "rgba(109,107,245,0.25)", color: "var(--accent-fg)",
                      fontWeight: 700, letterSpacing: "0.05em",
                    }}>
                      TODAY
                    </span>
                  )}
                </div>

                {/* Content column */}
                <div style={{
                  padding: "1.25rem 1.5rem",
                  display: "flex", flexDirection: "column", gap: "0.5rem",
                }}>
                  <p style={{
                    fontSize: "0.9rem", fontWeight: 700, color: "var(--fg)",
                    margin: 0, lineHeight: 1.35, letterSpacing: "-0.01em",
                  }}>
                    {idea.theme}
                  </p>
                  {idea.hook && (
                    <p style={{
                      fontSize: "0.82rem",
                      color: isToday ? "var(--accent-fg)" : "var(--muted)",
                      margin: 0, lineHeight: 1.55, fontStyle: "italic",
                    }}>
                      &ldquo;{idea.hook}&rdquo;
                    </p>
                  )}
                  {idea.talking_points?.length > 0 && (
                    <ul style={{ margin: 0, padding: "0 0 0 1rem", display: "flex", flexDirection: "column", gap: "0.2rem" }}>
                      {idea.talking_points.map((pt, j) => (
                        <li key={j} style={{ fontSize: "0.77rem", color: "var(--muted-2)", lineHeight: 1.5 }}>
                          {pt}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            );
          })}
        </section>
      )}

      {/* Past weeks */}
      {all.length > 1 && (
        <section style={{ background: "var(--card)", borderRadius: "var(--radius)", overflow: "hidden" }}>
          <div style={{
            padding: "0.875rem 1.5rem",
            borderBottom: "1px solid var(--border)",
          }}>
            <span style={{ fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--muted-2)" }}>
              Past weeks
            </span>
          </div>
          {all.slice(1).map((s, i) => {
            const ps = s.strategy as WeeklyStrategy | null;
            return (
              <div key={s.id} style={{
                padding: "0.875rem 1.5rem",
                borderBottom: i < all.length - 2 ? "1px solid var(--border)" : "none",
                display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem",
                opacity: 0.6,
              }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <p style={{ fontSize: "0.7rem", fontWeight: 600, color: "var(--muted-2)", margin: "0 0 0.25rem" }}>
                    {fmtWeek(s.week_start)}
                  </p>
                  {ps?.summary && (
                    <p style={{ fontSize: "0.82rem", color: "var(--muted)", margin: 0, lineHeight: 1.5 }}>
                      {ps.summary}
                    </p>
                  )}
                </div>
                <span style={{ fontSize: "0.68rem", color: "var(--muted-2)", flexShrink: 0 }}>
                  {ps?.ideas?.length ?? 0} days
                </span>
              </div>
            );
          })}
        </section>
      )}
    </div>
  );
}
