import { createServiceClient } from "@/lib/supabase/service";
import { getCurrentFounder } from "@/lib/founder";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createHash } from "crypto";
import { tasks } from "@trigger.dev/sdk/v3";
import type { brainBootstrap } from "@/trigger/brain-bootstrap";

/**
 * POST /api/ingest/website
 *
 * Scrapes a URL with Firecrawl, saves it as a raw_source, queues an extraction_job,
 * and triggers the brain.bootstrap task.
 *
 * Body: { url: string }
 * Returns: { rawSourceId, extractionJobId }
 */
export async function POST(request: NextRequest) {
  let founder;
  try {
    founder = await getCurrentFounder();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as { url?: string };
  const url = body.url?.trim();
  if (!url || !url.startsWith("http")) {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  const firecrawlKey = process.env.FIRECRAWL_API_KEY;
  if (!firecrawlKey) {
    return NextResponse.json({ error: "Firecrawl not configured" }, { status: 503 });
  }

  // Scrape with Firecrawl
  let markdown = "";
  let title = "";
  try {
    const fc = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${firecrawlKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ url, formats: ["markdown"] }),
      signal: AbortSignal.timeout(30_000),
    });
    if (fc.ok) {
      const fcData = (await fc.json()) as {
        success?: boolean;
        data?: { markdown?: string; metadata?: { title?: string } };
      };
      markdown = fcData.data?.markdown ?? "";
      title = fcData.data?.metadata?.title ?? "";
    }
  } catch (err) {
    console.error("[ingest/website] Firecrawl error:", err);
    return NextResponse.json({ error: "Failed to scrape URL" }, { status: 502 });
  }

  if (!markdown.trim()) {
    return NextResponse.json({ error: "No content found at that URL" }, { status: 422 });
  }

  const raw = { url, markdown, title };
  const contentHash = createHash("sha256")
    .update(url + markdown.slice(0, 500))
    .digest("hex");

  const db = createServiceClient();

  // Upsert raw_source (skip if identical content already saved)
  const { data: rawSource, error: rsError } = await db
    .from("raw_sources")
    .upsert(
      { founder_id: founder.id, kind: "website", url, raw, content_hash: contentHash, captured_by: "firecrawl" },
      { onConflict: "founder_id,content_hash", ignoreDuplicates: false }
    )
    .select("id")
    .single();

  if (rsError || !rawSource) {
    console.error("[ingest/website] raw_source upsert failed:", rsError);
    return NextResponse.json({ error: "Failed to save source" }, { status: 500 });
  }

  // Create extraction_job
  const { data: job, error: jobError } = await db
    .from("extraction_jobs")
    .insert({ founder_id: founder.id, raw_source_id: rawSource.id, status: "queued" })
    .select("id")
    .single();

  if (jobError || !job) {
    console.error("[ingest/website] extraction_job insert failed:", jobError);
    return NextResponse.json({ error: "Failed to queue job" }, { status: 500 });
  }

  // Advance onboarding state to 'analysis' if still at 'capture'
  await db
    .from("founders")
    .update({ onboarding_state: "analysis" })
    .eq("id", founder.id)
    .eq("onboarding_state", "capture");

  // Trigger brain.bootstrap (best-effort — app still works if Trigger.dev is not running)
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
    console.warn("[ingest/website] brain.bootstrap trigger failed (Trigger.dev not running?):", err);
  }

  return NextResponse.json({ rawSourceId: rawSource.id, extractionJobId: job.id });
}
