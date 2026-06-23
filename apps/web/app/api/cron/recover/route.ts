import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { tasks } from "@trigger.dev/sdk/v3";
import type { brainBootstrap } from "@/trigger/brain-bootstrap";

/**
 * GET /api/cron/recover
 *
 * Called by Vercel Cron every 5 minutes (see vercel.json).
 * Finds extraction_jobs stuck at 'queued' with no trigger_run_id for
 * more than 3 minutes — meaning brain.bootstrap was never triggered
 * (silent failure in the ingest route) — and re-triggers them.
 */
export async function GET(request: NextRequest) {
  // Vercel Cron attaches CRON_SECRET as a Bearer token automatically
  const auth = request.headers.get("authorization") ?? "";
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = createServiceClient();
  const cutoff = new Date(Date.now() - 3 * 60 * 1000).toISOString();

  const { data: stuckJobs, error } = await db
    .from("extraction_jobs")
    .select("id, founder_id, raw_source_id")
    .eq("status", "queued")
    .lt("created_at", cutoff)
    .is("trigger_run_id", null);

  if (error) {
    console.error("[cron/recover] query failed:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!stuckJobs?.length) {
    return NextResponse.json({ recovered: 0, total: 0 });
  }

  console.log(`[cron/recover] found ${stuckJobs.length} stuck job(s)`);

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
      console.log(`[cron/recover] re-triggered job ${job.id} → run ${handle.id}`);
    } catch (err) {
      console.error(`[cron/recover] failed to re-trigger job ${job.id}:`, err);
    }
  }

  return NextResponse.json({ recovered, total: stuckJobs.length });
}
