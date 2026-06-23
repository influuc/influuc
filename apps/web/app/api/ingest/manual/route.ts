import { createServiceClient } from "@/lib/supabase/service";
import { getCurrentFounder } from "@/lib/founder";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createHash } from "crypto";
import { tasks } from "@trigger.dev/sdk/v3";
import type { brainBootstrap } from "@/trigger/brain-bootstrap";

/**
 * POST /api/ingest/manual
 *
 * Saves a founder-provided text blob as a raw_source and triggers brain extraction.
 *
 * Body: { text: string }
 * Returns: { rawSourceId, extractionJobId }
 */
export async function POST(request: NextRequest) {
  let founder;
  try {
    founder = await getCurrentFounder();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as { text?: string };
  const text = body.text?.trim() ?? "";
  if (text.length < 20) {
    return NextResponse.json(
      { error: "Text must be at least 20 characters" },
      { status: 400 }
    );
  }

  const raw = { text };
  const contentHash = createHash("sha256").update(text).digest("hex");
  const db = createServiceClient();

  const { data: rawSource, error: rsError } = await db
    .from("raw_sources")
    .upsert(
      {
        founder_id: founder.id,
        kind: "manual",
        raw,
        content_hash: contentHash,
        captured_by: "manual",
      },
      { onConflict: "founder_id,content_hash", ignoreDuplicates: false }
    )
    .select("id")
    .single();

  if (rsError || !rawSource) {
    console.error("[ingest/manual] raw_source upsert failed:", rsError);
    return NextResponse.json({ error: "Failed to save source" }, { status: 500 });
  }

  const { data: job, error: jobError } = await db
    .from("extraction_jobs")
    .insert({ founder_id: founder.id, raw_source_id: rawSource.id, status: "queued" })
    .select("id")
    .single();

  if (jobError || !job) {
    return NextResponse.json({ error: "Failed to queue job" }, { status: 500 });
  }

  // Advance onboarding state
  await db
    .from("founders")
    .update({ onboarding_state: "analysis" })
    .eq("id", founder.id)
    .eq("onboarding_state", "capture");

  try {
    const handle = await tasks.trigger<typeof brainBootstrap>("brain.bootstrap", {
      founderId: founder.id,
      rawSourceId: rawSource.id,
      extractionJobId: job.id,
    });
    await db
      .from("extraction_jobs")
      .update({ trigger_run_id: handle.id })
      .eq("id", job.id);
  } catch (err) {
    console.warn("[ingest/manual] brain.bootstrap trigger failed:", err);
  }

  return NextResponse.json({ rawSourceId: rawSource.id, extractionJobId: job.id });
}
