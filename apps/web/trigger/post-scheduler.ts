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

// UTC hour when each post type + sort_order should go out
const SLOT_HOURS: Record<string, Record<number, number>> = {
  x_short:  { 0: 9, 1: 14 },
  x_long:   { 2: 19 },
  linkedin: { 0: 10 },
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

    const { data: posts, error } = await db
      .from("weekly_posts")
      .select("id, founder_id, post_type, sort_order")
      .eq("scheduled_date", todayStr)
      .eq("status", "approved");

    if (error) throw new Error(`Scheduler query failed: ${error.message}`);
    if (!posts?.length) {
      logger.info("post.scheduler: no approved posts today");
      return { triggered: 0 };
    }

    let triggered = 0;

    for (const post of posts) {
      const hour = slotHour(post.post_type, post.sort_order);
      if (hour === null || currentHour < hour) continue;

      // Atomically claim the post (approved → scheduled) to prevent double-publish
      const { data: claimed } = await db
        .from("weekly_posts")
        .update({ status: "scheduled" })
        .eq("id", post.id)
        .eq("status", "approved") // only succeeds if still approved
        .select("id");

      if (!claimed?.length) continue; // another scheduler run already claimed it

      await tasks.trigger<typeof postPublish>("post.publish", {
        postId: post.id,
        founderId: post.founder_id,
      });

      triggered++;
    }

    logger.info("post.scheduler: done", { triggered, checked: posts.length });
    return { triggered };
  },
});
