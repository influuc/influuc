import { getCurrentFounder } from "@/lib/founder";
import { createServiceClient } from "@/lib/supabase/service";
import { redirect } from "next/navigation";
import { XCalendar } from "./x-calendar";

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
      <div style={{ padding: "2rem 2.5rem 4rem", maxWidth: 900, margin: "0 auto", width: "100%" }}>
        <h1 style={{ fontSize: "1.4rem", fontWeight: 700, letterSpacing: "-0.025em", margin: "0 0 0.4rem" }}>X Calendar</h1>
        <p style={{ color: "var(--muted)", fontSize: "0.82rem", margin: 0 }}>
          No content generated yet. Complete onboarding to generate your first week.
        </p>
      </div>
    );
  }

  const { data: posts } = await db
    .from("weekly_posts")
    .select("id, content, post_type, status, sort_order, scheduled_date, source_tweet_id, source_tweet_content, source_tweet_author")
    .eq("founder_id", founder.id)
    .eq("strategy_id", strategy.id)
    .eq("platform", "x")
    .order("scheduled_date")
    .order("sort_order");

  const allPosts = posts ?? [];

  return (
    <div style={{
      padding: "2rem 2.5rem 4rem",
      maxWidth: 900,
      margin: "0 auto",
      width: "100%",
    }}>
      <div style={{ marginBottom: "0.375rem", display: "flex", alignItems: "center", gap: "0.625rem" }}>
        <div style={{
          width: 28, height: 28, borderRadius: 7,
          background: "rgba(255,255,255,0.08)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="var(--fg)">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
        </div>
        <h1 style={{ fontSize: "1.3rem", fontWeight: 700, letterSpacing: "-0.025em", margin: 0 }}>X Calendar</h1>
      </div>

      <XCalendar posts={allPosts} strategyId={strategy.id} />
    </div>
  );
}
