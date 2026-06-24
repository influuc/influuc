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
  const end = new Date(weekStart + "T00:00:00Z");
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

  const all = strategies ?? [];
  const current = all[0] ?? null;

  if (!current) {
    return (
      <div style={{ padding: "2rem 2.5rem 4rem", maxWidth: 860, margin: "0 auto", width: "100%" }}>
        <h1 style={{ fontSize: "1.4rem", fontWeight: 700, letterSpacing: "-0.025em", margin: 0 }}>
          Weekly Strategy
        </h1>
        <p style={{ color: "var(--muted)", fontSize: "0.82rem", marginTop: "0.3rem" }}>
          No strategy generated yet.
        </p>
      </div>
    );
  }

  const strat = current.strategy as WeeklyStrategy | null;
  const ideas: StrategyIdea[] = strat?.ideas ?? [];
  const todayStr = new Date().toISOString().slice(0, 10);

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
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "0.75rem" }}>
        <div>
          <h1 style={{ fontSize: "1.4rem", fontWeight: 700, letterSpacing: "-0.025em", margin: 0, color: "var(--fg)" }}>
            Weekly Strategy
          </h1>
          <p style={{ color: "var(--muted)", fontSize: "0.82rem", marginTop: "0.3rem" }}>
            {fmtWeek(current.week_start)}
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <Link href="/dashboard/x" style={{
            fontSize: "0.78rem", color: "var(--muted)", textDecoration: "none",
            padding: "0.4rem 0.875rem", borderRadius: 8,
            background: "var(--card)",
          }}>
            Review X posts →
          </Link>
          <Link href="/dashboard/linkedin" style={{
            fontSize: "0.78rem", color: "var(--muted)", textDecoration: "none",
            padding: "0.4rem 0.875rem", borderRadius: 8,
            background: "var(--card)",
          }}>
            Review LinkedIn →
          </Link>
        </div>
      </div>

      {/* Summary */}
      {strat?.summary && (
        <div style={{
          padding: "1.25rem 1.5rem",
          background: "rgba(109,107,245,0.1)",
          borderRadius: "var(--radius)",
          boxShadow: "inset 3px 0 0 rgba(109,107,245,0.5)",
        }}>
          <p style={{ fontSize: "0.7rem", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--muted-2)", margin: "0 0 0.5rem" }}>
            This week&apos;s theme
          </p>
          <p style={{ fontSize: "0.95rem", color: "var(--fg)", lineHeight: 1.6, margin: 0, fontWeight: 500 }}>
            {strat.summary}
          </p>
        </div>
      )}

      {/* Day cards */}
      {ideas.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
          {ideas.map((idea, i) => {
            const isPast = idea.date < todayStr;
            const isToday = idea.date === todayStr;
            const dayLabel = DAYS[i] ?? `Day ${idea.day}`;

            return (
              <div key={idea.date} style={{
                padding: "1.25rem 1.5rem",
                background: isPast ? "rgba(255,255,255,0.01)" : isToday ? "rgba(109,107,245,0.07)" : "var(--card)",
                borderRadius: "var(--radius)",
                opacity: isPast ? 0.5 : 1,
                display: "flex",
                gap: "1.25rem",
                boxShadow: isToday ? "inset 3px 0 0 rgba(109,107,245,0.5)" : "none",
              }}>
                {/* Day label */}
                <div style={{
                  flexShrink: 0,
                  width: 52,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "flex-start",
                  paddingTop: "0.1rem",
                  gap: "0.2rem",
                }}>
                  <span style={{
                    fontSize: "0.68rem",
                    fontWeight: 700,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    color: isToday ? "var(--accent-fg)" : "var(--muted-2)",
                  }}>
                    {dayLabel}
                  </span>
                  <span style={{ fontSize: "0.72rem", color: "var(--muted-2)" }}>
                    {fmtDate(idea.date)}
                  </span>
                  {isToday && (
                    <span style={{
                      fontSize: "0.6rem",
                      padding: "1px 6px",
                      borderRadius: 99,
                      background: "rgba(109,107,245,0.2)",
                      color: "var(--accent-fg)",
                      fontWeight: 600,
                      marginTop: "0.2rem",
                    }}>
                      today
                    </span>
                  )}
                </div>

                {/* Divider */}
                <div style={{ width: 1, background: "var(--border)", flexShrink: 0, alignSelf: "stretch" }} />

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: "0.625rem" }}>
                  <p style={{ fontSize: "0.88rem", fontWeight: 600, color: "var(--fg)", margin: 0, lineHeight: 1.4 }}>
                    {idea.theme}
                  </p>
                  {idea.hook && (
                    <p style={{ fontSize: "0.82rem", color: "var(--muted)", margin: 0, lineHeight: 1.5, fontStyle: "italic" }}>
                      &ldquo;{idea.hook}&rdquo;
                    </p>
                  )}
                  {idea.talking_points?.length > 0 && (
                    <ul style={{ margin: 0, padding: "0 0 0 1.1rem", display: "flex", flexDirection: "column", gap: "0.25rem" }}>
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
        <section style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <div style={{ paddingBottom: "0.625rem", borderBottom: "1px solid var(--border)" }}>
            <h2 style={{ fontSize: "0.75rem", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--muted-2)", margin: 0 }}>
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
                  borderRadius: 10,
                  opacity: 0.55,
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem" }}>
                    <div>
                      <p style={{ fontSize: "0.72rem", color: "var(--muted-2)", margin: "0 0 0.25rem" }}>
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
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
