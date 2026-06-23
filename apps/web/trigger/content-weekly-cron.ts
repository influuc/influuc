import { schedules, logger, tasks } from "@trigger.dev/sdk/v3";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@influuc/db";
import type { contentGenerate } from "./content-generate";

if (typeof globalThis.WebSocket === "undefined") {
  // @ts-ignore
  globalThis.WebSocket = class StubWS extends EventTarget {
    static CONNECTING = 0; static OPEN = 1; static CLOSING = 2; static CLOSED = 3;
    readyState = 3; close() {} send() {}
  };
}

export const contentWeeklyCron = schedules.task({
  id: "content.weekly-cron",
  // Run every hour — rolling 7-day refresh means each user's day is different,
  // so we check hourly rather than once at midnight
  cron: "0 * * * *",
  maxDuration: 120,

  run: async () => {
    const db = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const now = new Date();
    const nowIso = now.toISOString();

    const { data: founders, error } = await db
      .from("founders")
      .select("id, next_generation_at")
      .eq("onboarding_state", "done")
      .not("next_generation_at", "is", null)
      .lte("next_generation_at", nowIso);

    if (error) throw new Error(`Weekly cron query failed: ${error.message}`);
    if (!founders?.length) {
      logger.info("content.weekly-cron: no founders due");
      return { triggered: 0 };
    }

    let triggered = 0;

    for (const founder of founders) {
      const weekStart = now.toISOString().split("T")[0]!;
      const nextGenAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();

      // Advance next_generation_at atomically before triggering to prevent double-run
      const { data: advanced } = await db
        .from("founders")
        .update({ next_generation_at: nextGenAt })
        .eq("id", founder.id)
        .eq("next_generation_at", founder.next_generation_at!) // optimistic lock
        .select("id");

      if (!advanced?.length) {
        logger.info("content.weekly-cron: skipping (already advanced)", { founderId: founder.id });
        continue;
      }

      await tasks.trigger<typeof contentGenerate>("content.generate", {
        founderId: founder.id,
        weekStart,
      });

      logger.info("content.weekly-cron: triggered generation", { founderId: founder.id, weekStart });
      triggered++;
    }

    logger.info("content.weekly-cron: done", { triggered });
    return { triggered };
  },
});
