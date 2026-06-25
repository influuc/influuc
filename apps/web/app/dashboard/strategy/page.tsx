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
      <div style={{ padding: "2.5rem 2.5rem 5rem", maxWidth: 900, margin: "0 auto", width: "100%" }}>
        <div style={{
          padding: "4rem 2rem", textAlign: "center",
          background: "var(--card)", borderRadius: 14, border: "1px solid var(--border)",
          marginTop: "2rem",
        }}>
          <p style={{ fontSize: "1rem", fontWeight: 600, color: "var(--fg)", margin: "0 0 0.5rem" }}>
            No strategy yet
          </p>
          <p style={{ color: "var(--muted)", fontSize: "0.82rem", lineHeight: 1.6, margin: 0 }}>
            Your weekly strategy will appear here once the AI generates it — usually after onboarding.
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
      padding: "2.5rem 2.5rem 5rem",
      maxWidth: 900,
      margin: "0 auto",
      width: "100%",
      display: "flex",
      flexDirection: "column",
      gap: "1.75rem",
    }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: "1rem" }}>
          <div style={{
            width: 48, height: 48, borderRadius: 14, flexShrink: 0,
            background: "linear-gradient(135deg, rgba(109,107,245,0.2) 0%, rgba(52,211,153,0.2) 100%)",
            border: "1px solid rgba(109,107,245,0.25)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#a5b4fc" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
              <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
            </svg>
          </div>
          <div>
            <h1 style={{ fontSize: "1.65rem", fontWeight: 800, letterSpacing: "-0.03em", margin: 0, color: "var(--fg)" }}>
              Weekly Strategy
            </h1>
            <p style={{ color: "var(--muted)", fontSize: "0.85rem", marginTop: "0.25rem" }}>
              {fmtWeek(current.week_start)}
            </p>
          </div>
        </div>

        {/* Review buttons */}
        <div style={{ display: "flex", gap: "0.5rem", flexShrink: 0 }}>
          <Link href="/dashboard/x" style={{
            display: "flex", alignItems: "center", gap: "0.5rem",
            fontSize: "0.78rem", fontWeight: 600, color: "var(--fg)", textDecoration: "none",
            padding: "0.5rem 0.875rem", borderRadius: 9,
            background: "rgba(255,255,255,0.07)",
            border: "1px solid rgba(255,255,255,0.12)",
          }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
            Review posts
          </Link>
          <Link href="/dashboard/linkedin" style={{
            display: "flex", alignItems: "center", gap: "0.5rem",
            fontSize: "0.78rem", fontWeight: 600, color: "#60a5fa", textDecoration: "none",
            padding: "0.5rem 0.875rem", borderRadius: 9,
            background: "rgba(10,102,194,0.12)",
            border: "1px solid rgba(10,102,194,0.25)",
          }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
            </svg>
            Review posts
          </Link>
        </div>
      </div>

      {/* Week theme summary */}
      {strat?.summary && (
        <div style={{
          padding: "1.25rem 1.5rem",
          background: "rgba(109,107,245,0.08)",
          border: "1px solid rgba(109,107,245,0.2)",
          borderRadius: 14,
          boxShadow: "inset 4px 0 0 rgba(109,107,245,0.5)",
        }}>
          <p style={{
            fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.08em",
            textTransform: "uppercase", color: "var(--accent-fg)", margin: "0 0 0.5rem",
          }}>
            This week&apos;s theme
          </p>
          <p style={{ fontSize: "0.975rem", color: "var(--fg)", lineHeight: 1.6, margin: 0, fontWeight: 500 }}>
            {strat.summary}
          </p>
        </div>
      )}

      {/* Day cards */}
      {ideas.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {ideas.map((idea, i) => {
            const isPast  = idea.date < todayStr;
            const isToday = idea.date === todayStr;
            const dayLabel = DAYS[i] ?? `Day ${idea.day}`;

            return (
              <div key={idea.date} style={{
                padding: "1.25rem 1.5rem",
                background: isToday ? "rgba(109,107,245,0.07)" : isPast ? "rgba(255,255,255,0.01)" : "var(--card)",
                border: isToday
                  ? "1px solid rgba(109,107,245,0.3)"
                  : isPast
                    ? "1px solid var(--border)"
                    : "1px solid var(--border-med)",
                borderRadius: 14,
                opacity: isPast ? 0.65 : 1,
                display: "flex", gap: "1.5rem",
                boxShadow: isToday ? "0 0 24px rgba(109,107,245,0.12)" : "none",
              }}>
                {/* Day label */}
                <div style={{
                  flexShrink: 0, width: 56,
                  display: "flex", flexDirection: "column",
                  alignItems: "center", paddingTop: "0.1rem", gap: "0.25rem",
                }}>
                  <span style={{
                    fontSize: "0.72rem", fontWeight: 800, letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    color: isToday ? "var(--accent-fg)" : isPast ? "var(--muted-2)" : "var(--muted)",
                  }}>
                    {dayLabel}
                  </span>
                  <span style={{ fontSize: "0.7rem", color: "var(--muted-2)" }}>
                    {fmtDate(idea.date)}
                  </span>
                  {isToday && (
                    <span style={{
                      fontSize: "0.58rem", padding: "1px 7px", borderRadius: 99,
                      background: "rgba(109,107,245,0.25)", color: "var(--accent-fg)",
                      fontWeight: 700, marginTop: "0.1rem", letterSpacing: "0.04em",
                    }}>
                      TODAY
                    </span>
                  )}
                </div>

                {/* Vertical divider */}
                <div style={{
                  width: 1, flexShrink: 0, alignSelf: "stretch",
                  background: isToday ? "rgba(109,107,245,0.3)" : "var(--border)",
                }} />

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: "0.625rem" }}>
                  <p style={{
                    fontSize: "0.95rem", fontWeight: 700, color: "var(--fg)", margin: 0, lineHeight: 1.35,
                    letterSpacing: "-0.01em",
                  }}>
                    {idea.theme}
                  </p>
                  {idea.hook && (
                    <p style={{
                      fontSize: "0.85rem", color: isToday ? "var(--accent-fg)" : "var(--muted)",
                      margin: 0, lineHeight: 1.55, fontStyle: "italic",
                    }}>
                      &ldquo;{idea.hook}&rdquo;
                    </p>
                  )}
                  {idea.talking_points?.length > 0 && (
                    <ul style={{ margin: 0, padding: "0 0 0 1.1rem", display: "flex", flexDirection: "column", gap: "0.2rem" }}>
                      {idea.talking_points.map((pt, j) => (
                        <li key={j} style={{ fontSize: "0.78rem", color: "var(--muted-2)", lineHeight: 1.5 }}>
                          {pt}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Past weeks */}
      {all.length > 1 && (
        <section>
          <div style={{ paddingBottom: "0.75rem", marginBottom: "0.75rem", borderBottom: "1px solid var(--border)" }}>
            <h2 style={{
              fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.06em",
              textTransform: "uppercase", color: "var(--muted-2)", margin: 0,
            }}>
              Past weeks
            </h2>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {all.slice(1).map(s => {
              const ps = s.strategy as WeeklyStrategy | null;
              return (
                <div key={s.id} style={{
                  padding: "0.875rem 1.25rem",
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: 10,
                  opacity: 0.65,
                  display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem",
                }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <p style={{ fontSize: "0.7rem", color: "var(--muted-2)", margin: "0 0 0.3rem", fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase" }}>
                      {fmtWeek(s.week_start)}
                    </p>
                    {ps?.summary && (
                      <p style={{ fontSize: "0.82rem", color: "var(--muted)", margin: 0, lineHeight: 1.5 }}>
                        {ps.summary}
                      </p>
                    )}
                  </div>
                  <span style={{ fontSize: "0.68rem", color: "var(--muted-2)", flexShrink: 0, marginTop: "0.1rem" }}>
                    {ps?.ideas?.length ?? 0} days
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
