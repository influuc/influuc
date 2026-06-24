import { getCurrentFounder } from "@/lib/founder";
import { createServiceClient } from "@/lib/supabase/service";
import { redirect } from "next/navigation";
import { LinkedInCalendar } from "./linkedin-calendar";

export default async function LinkedInSchedulePage() {
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
        <h1 style={{ fontSize: "1.4rem", fontWeight: 700, letterSpacing: "-0.025em", margin: "0 0 0.4rem" }}>LinkedIn Calendar</h1>
        <p style={{ color: "var(--muted)", fontSize: "0.82rem", margin: 0 }}>
          No content generated yet. Complete onboarding to generate your first week.
        </p>
      </div>
    );
  }

  const { data: posts } = await db
    .from("weekly_posts")
    .select("id, content, post_type, status, scheduled_date")
    .eq("founder_id", founder.id)
    .eq("strategy_id", strategy.id)
    .eq("platform", "linkedin")
    .order("scheduled_date");

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
          background: "#0a66c2",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="white">
            <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
          </svg>
        </div>
        <h1 style={{ fontSize: "1.3rem", fontWeight: 700, letterSpacing: "-0.025em", margin: 0 }}>LinkedIn Calendar</h1>
      </div>

      <LinkedInCalendar posts={allPosts} />
    </div>
  );
}
