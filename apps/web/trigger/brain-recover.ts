import { schedules, tasks, logger } from "@trigger.dev/sdk/v3";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@influuc/db";
import type { brainBootstrap } from "./brain-bootstrap";

if (typeof globalThis.WebSocket === "undefined") {
  // @ts-ignore
  globalThis.WebSocket = class StubWS extends EventTarget {
    static CONNECTING = 0; static OPEN = 1; static CLOSING = 2; static CLOSED = 3;
    readyState = 3;
    close() {}
    send() {}
  };
}

function createDb() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

// Runs on a schedule set in the Trigger.dev dashboard (every 5 min).
// Finds extraction_jobs stuck at 'queued' with no trigger_run_id for >3 min
// — meaning brain.bootstrap was never triggered (silent failure) — and re-triggers them.
export const brainRecover = schedules.task({
  id: "brain.recover",
  run: async () => {
    const db = createDb();
    const cutoff = new Date(Date.now() - 3 * 60 * 1000).toISOString();

    const { data: stuckJobs, error } = await db
      .from("extraction_jobs")
      .select("id, founder_id, raw_source_id")
      .eq("status", "queued")
      .lt("created_at", cutoff)
      .is("trigger_run_id", null);

    if (error) {
      logger.error("brain.recover: query failed", { error: error.message });
      return { recovered: 0 };
    }

    if (!stuckJobs?.length) {
      logger.info("brain.recover: no stuck jobs");
      return { recovered: 0, total: 0 };
    }

    logger.info("brain.recover: found stuck jobs", { count: stuckJobs.length });

    let recovered = 0;
    for (const job of stuckJobs) {
      if (!job.raw_source_id) continue;
      try {
        const handle = await tasks.trigger<typeof brainBootstrap>("brain.bootstrap", {
          founderId: job.founder_id,
          rawSourceId: job.raw_source_id,
          extractionJobId: job.id,
        });
        await db
          .from("extraction_jobs")
          .update({ trigger_run_id: handle.id })
          .eq("id", job.id);
        recovered++;
        logger.info("brain.recover: re-triggered", { jobId: job.id, runId: handle.id });
      } catch (err) {
        logger.error("brain.recover: failed to re-trigger", { jobId: job.id, error: String(err) });
      }
    }

    return { recovered, total: stuckJobs.length };
  },
});
