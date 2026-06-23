import { schedules, logger } from "@trigger.dev/sdk/v3";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@influuc/db";

if (typeof globalThis.WebSocket === "undefined") {
  // @ts-ignore
  globalThis.WebSocket = class StubWS extends EventTarget {
    static CONNECTING = 0; static OPEN = 1; static CLOSING = 2; static CLOSED = 3;
    readyState = 3; close() {} send() {}
  };
}

export const contentWeeklyCron = schedules.task({
  id: "content.weekly-cron",
  cron: "0 * * * *",
  maxDuration: 60,

  run: async () => {
    const db = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const nowIso = new Date().toISOString();

    const { data: founders, error } = await db
      .from("founders")
      .select("id, next_generation_at")
      .eq("onboarding_state", "done")
      .eq("reflection_pending", false)
      .not("next_generation_at", "is", null)
      .lte("next_generation_at", nowIso);

    if (error) throw new Error(`Weekly cron query failed: ${error.message}`);
    if (!founders?.length) {
      logger.info("content.weekly-cron: no founders due");
      return { flagged: 0 };
    }

    let flagged = 0;

    for (const founder of founders) {
      // Atomically claim this founder — only succeeds if next_generation_at hasn't changed
      const { data: claimed } = await db
        .from("founders")
        .update({ reflection_pending: true })
        .eq("id", founder.id)
        .eq("next_generation_at", founder.next_generation_at!)
        .eq("reflection_pending", false)
        .select("id");

      if (!claimed?.length) {
        logger.info("content.weekly-cron: skipping (already claimed)", { founderId: founder.id });
        continue;
      }

      logger.info("content.weekly-cron: reflection flagged", { founderId: founder.id });
      flagged++;
    }

    logger.info("content.weekly-cron: done", { flagged });
    return { flagged };
  },
});
