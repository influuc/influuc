import { getCurrentFounder } from "@/lib/founder";
import { createServiceClient } from "@/lib/supabase/service";
import { redirect } from "next/navigation";
import { OppCard, type OppCardProps } from "./opp-card";

export default async function OpportunitiesPage() {
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

  const { data: opps } = await db
    .from("opportunities")
    .select(`
      id, type, title, summary, source_url, signal_at,
      priority_score, relevance_score, urgency_score, status
    `)
    .eq("founder_id", founder.id)
    .in("status", ["surfaced", "accepted", "dismissed"])
    .order("priority_score", { ascending: false, nullsFirst: false })
    .limit(40);

  const { data: matches } = await db
    .from("opportunity_matches")
    .select("opportunity_id, match_reason")
    .eq("founder_id", founder.id);

  const matchMap = new Map(
    (matches ?? []).map(m => [m.opportunity_id, m.match_reason])
  );

  const active = (opps ?? []).filter(o => o.status === "surfaced" || o.status === "accepted");
  const dismissed = (opps ?? []).filter(o => o.status === "dismissed");

  const toCardProps = (o: NonNullable<typeof opps>[number]): OppCardProps => ({
    id: o.id,
    type: o.type,
    title: o.title,
    summary: o.summary,
    source_url: o.source_url,
    signal_at: o.signal_at,
    priority_score: o.priority_score,
    relevance_score: o.relevance_score,
    urgency_score: o.urgency_score,
    match_reason: matchMap.get(o.id) ?? null,
    initialStatus: o.status as "surfaced" | "accepted" | "dismissed",
  });

  return (
    <div style={{
      padding: "2rem 2.5rem 4rem",
      maxWidth: 760,
      margin: "0 auto",
      width: "100%",
      display: "flex",
      flexDirection: "column",
      gap: "1.75rem",
    }}>
      {/* Header */}
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", marginBottom: "0.35rem" }}>
          <div style={{
            width: 30, height: 30, borderRadius: 8,
            background: "rgba(251,146,60,0.12)",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#fb923c",
          }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
          </div>
          <h1 style={{ fontSize: "1.3rem", fontWeight: 700, letterSpacing: "-0.025em", margin: 0 }}>
            Opportunities
          </h1>
        </div>
        <p style={{ color: "var(--muted)", fontSize: "0.82rem", margin: 0 }}>
          Trending topics and signals curated for your brand. Updated daily.
        </p>
      </div>

      {active.length === 0 && dismissed.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          {/* Active opportunities */}
          {active.length > 0 && (
            <section style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <p style={{
                fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.1em",
                textTransform: "uppercase", color: "var(--muted-2)", margin: 0,
              }}>
                {active.length} active · sorted by priority
              </p>
              {active.map(o => (
                <OppCard key={o.id} {...toCardProps(o)} />
              ))}
            </section>
          )}

          {/* Dismissed */}
          {dismissed.length > 0 && (
            <section style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
              <p style={{
                fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.1em",
                textTransform: "uppercase", color: "var(--muted-2)", margin: 0,
              }}>
                {dismissed.length} dismissed
              </p>
              {dismissed.map(o => (
                <OppCard key={o.id} {...toCardProps(o)} />
              ))}
            </section>
          )}
        </>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      padding: "4rem 2rem", gap: "1rem", textAlign: "center",
      background: "var(--card)", borderRadius: "var(--radius)",
      border: "1px solid var(--border)",
    }}>
      <div style={{
        width: 52, height: 52, borderRadius: 14,
        background: "rgba(251,146,60,0.08)",
        display: "flex", alignItems: "center", justifyContent: "center",
        color: "#fb923c",
      }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </svg>
      </div>
      <div>
        <p style={{ fontWeight: 600, fontSize: "0.95rem", color: "var(--fg)", margin: "0 0 0.35rem" }}>
          No opportunities yet
        </p>
        <p style={{ color: "var(--muted)", fontSize: "0.8rem", margin: 0, maxWidth: 340, lineHeight: 1.55 }}>
          Your daily opportunity scan runs at 1:30 PM IST. Make sure your focus topics are set in{" "}
          <a href="/dashboard/settings" style={{ color: "var(--accent-fg)", textDecoration: "none" }}>
            Settings
          </a>{" "}
          so we know what to look for.
        </p>
      </div>
    </div>
  );
}
