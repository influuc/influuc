import { schedules, logger, tasks } from "@trigger.dev/sdk/v3";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@influuc/db";
import type { postPublish } from "./post-publish";

if (typeof globalThis.WebSocket === "undefined") {
  // @ts-ignore
  globalThis.WebSocket = class StubWS extends EventTarget {
    static CONNECTING = 0; static OPEN = 1; static CLOSING = 2; static CLOSED = 3;
    readyState = 3; close() {} send() {}
  };
}

// UTC hours matching IST targets: 9 AM IST=UTC 3, 1 PM IST=UTC 7, 7 PM IST=UTC 13, 9:30 AM IST=UTC 4
const SLOT_HOURS: Record<string, Record<number, number>> = {
  x_short:  { 0: 3, 1: 7 },
  x_long:   { 2: 13 },
  linkedin: { 0: 4 },
};

function slotHour(postType: string, sortOrder: number): number | null {
  return SLOT_HOURS[postType]?.[sortOrder] ?? null;
}

export const postScheduler = schedules.task({
  id: "post.scheduler",
  cron: "*/15 * * * *",
  maxDuration: 120,

  run: async () => {
    const db = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const now = new Date();
    const todayStr = now.toISOString().split("T")[0]!;
    const currentHour = now.getUTCHours();

    // 1. Today's actionable posts: approved (any mode) or draft (autopilot auto-approve candidates)
    const { data: posts, error } = await db
      .from("weekly_posts")
      .select("id, founder_id, post_type, sort_order, status")
      .eq("scheduled_date", todayStr)
      .in("status", ["approved", "draft"]);

    if (error) throw new Error(`Scheduler query failed: ${error.message}`);
    if (!posts?.length) {
      logger.info("post.scheduler: nothing actionable today");
      return { triggered: 0, autoApproved: 0 };
    }

    const founderIds = [...new Set(posts.map((p) => p.founder_id))];

    // 2. Per-founder preferences (mode, kill-switch, cap)
    const { data: prefsRows } = await db
      .from("operating_preferences")
      .select("founder_id, mode, publishing_paused, max_autopilot_per_day")
      .in("founder_id", founderIds);

    const prefs = new Map((prefsRows ?? []).map((p) => [p.founder_id, p]));

    // 3. Baseline cap usage — posts already committed by autopilot today
    //    (approved + scheduled + published all count against the daily autopilot cap)
    const { data: committedRows } = await db
      .from("weekly_posts")
      .select("founder_id")
      .eq("scheduled_date", todayStr)
      .in("status", ["approved", "scheduled", "published"]);

    const capUsed = new Map<string, number>();
    for (const r of committedRows ?? []) {
      capUsed.set(r.founder_id, (capUsed.get(r.founder_id) ?? 0) + 1);
    }

    let triggered = 0;
    let autoApproved = 0;
    let skippedPaused = 0;

    for (const post of posts) {
      const pref = prefs.get(post.founder_id);

      // ── Kill-switch: halt everything for this founder ──────────────────────
      if (pref?.publishing_paused) { skippedPaused++; continue; }

      const isAutopilot = pref?.mode === "autopilot";

      // ── Autopilot: auto-approve drafts up to the daily cap ─────────────────
      if (post.status === "draft") {
        if (!isAutopilot) continue; // manual/assisted require human approval

        const cap = pref?.max_autopilot_per_day ?? 3;
        const used = capUsed.get(post.founder_id) ?? 0;
        if (used >= cap) continue; // cap reached for today

        const { data: approved } = await db
          .from("weekly_posts")
          .update({ status: "approved" })
          .eq("id", post.id)
          .eq("status", "draft") // only if still a draft
          .select("id");

        if (!approved?.length) continue;
        capUsed.set(post.founder_id, used + 1);
        autoApproved++;
        post.status = "approved"; // fall through to publishing check below
      }

      // ── Publish approved posts whose slot has arrived ──────────────────────
      if (post.status === "approved") {
        const hour = slotHour(post.post_type, post.sort_order);
        if (hour === null || currentHour < hour) continue;

        const { data: claimed } = await db
          .from("weekly_posts")
          .update({ status: "scheduled" })
          .eq("id", post.id)
          .eq("status", "approved") // atomic claim — only succeeds if still approved
          .select("id");

        if (!claimed?.length) continue; // another run claimed it

        await tasks.trigger<typeof postPublish>("post.publish", {
          postId: post.id,
          founderId: post.founder_id,
        });
        triggered++;
      }
    }

    logger.info("post.scheduler: done", { triggered, autoApproved, skippedPaused, checked: posts.length });
    return { triggered, autoApproved, skippedPaused };
  },
});
