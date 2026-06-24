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

      // Email the founder that their reflection is due
      try {
        if (process.env.RESEND_API_KEY) {
          const { data: founderRow } = await db.from("founders").select("account_id").eq("id", founder.id).single();
          if (founderRow?.account_id) {
            const { data: authData } = await db.auth.admin.getUserById(founderRow.account_id);
            const email = authData?.user?.email;
            if (email) {
              const { Resend } = await import("resend");
              const resend = new Resend(process.env.RESEND_API_KEY);
              await resend.emails.send({
                from: process.env.RESEND_FROM_EMAIL ?? "Influuc <onboarding@resend.dev>",
                to: [email],
                subject: "Time for your weekly reflection",
                text: `It's time to fill in your weekly reflection so Influuc can generate next week's content.\n\nTake 2 minutes here: https://influuc.com/dashboard`,
              });
            }
          }
        }
      } catch (emailErr) {
        logger.warn("content.weekly-cron: reflection email failed (non-fatal)", { founderId: founder.id, err: String(emailErr) });
      }

      logger.info("content.weekly-cron: reflection flagged", { founderId: founder.id });
      flagged++;
    }

    logger.info("content.weekly-cron: done", { flagged });
    return { flagged };
  },
});
