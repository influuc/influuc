import { createServiceClient } from "@/lib/supabase/service";
import { verifyExtensionToken } from "@/lib/extension-token";
import type { Json } from "@influuc/db";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createHash } from "crypto";
import { tasks } from "@trigger.dev/sdk/v3";
import type { brainBootstrap } from "@/trigger/brain-bootstrap";

/**
 * POST /api/ingest/extension
 *
 * Receives scraped profile payload from the Influuc Chrome extension.
 * Authenticated via a short-lived extension token (not the Supabase session,
 * since the extension background worker runs in a separate context).
 *
 * Body: { platform: "x" | "linkedin", profileUrl: string, data: Record<string, unknown> }
 */
export async function POST(request: NextRequest) {
  const auth = request.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  const verified = verifyExtensionToken(token);
  if (!verified) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { platform: string; profileUrl: string; data: Record<string, unknown> };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { platform, profileUrl, data } = body;
  if (!platform || !profileUrl || !data || typeof data !== "object") {
    return NextResponse.json({ error: "Missing fields: platform, profileUrl, data" }, { status: 400 });
  }
  if (!["x", "linkedin"].includes(platform)) {
    return NextResponse.json({ error: "platform must be x or linkedin" }, { status: 400 });
  }
  if (profileUrl.length > 500) {
    return NextResponse.json({ error: "profileUrl too long" }, { status: 400 });
  }

  const db = createServiceClient();
  const founderId = verified.founderId;

  const contentHash = createHash("sha256")
    .update(JSON.stringify(data))
    .digest("hex");

  const { data: rawSource, error: rsError } = await db
    .from("raw_sources")
    .upsert(
      {
        founder_id: founderId,
        kind: platform as "x" | "linkedin",
        url: profileUrl,
        raw: data as unknown as Json,
        content_hash: contentHash,
        captured_by: "extension",
      },
      { onConflict: "founder_id,content_hash", ignoreDuplicates: false }
    )
    .select("id")
    .single();

  if (rsError || !rawSource) {
    console.error("[ingest/extension] raw_source upsert failed:", rsError);
    return NextResponse.json({ error: "Failed to save source" }, { status: 500 });
  }

  const { data: job, error: jobError } = await db
    .from("extraction_jobs")
    .insert({ founder_id: founderId, raw_source_id: rawSource.id, status: "queued" })
    .select("id")
    .single();

  if (jobError || !job) {
    console.error("[ingest/extension] extraction_job insert failed:", jobError);
    return NextResponse.json({ error: "Failed to queue job" }, { status: 500 });
  }

  // Advance onboarding state from extension → capture if still at extension step
  await db
    .from("founders")
    .update({ onboarding_state: "capture" })
    .eq("id", founderId)
    .eq("onboarding_state", "extension");

  try {
    const handle = await tasks.trigger<typeof brainBootstrap>("brain.bootstrap", {
      founderId,
      rawSourceId: rawSource.id,
      extractionJobId: job.id,
    });
    await db
      .from("extraction_jobs")
      .update({ trigger_run_id: handle.id })
      .eq("id", job.id);
  } catch (err) {
    console.warn("[ingest/extension] brain.bootstrap trigger failed:", err);
  }

  return NextResponse.json({ rawSourceId: rawSource.id, extractionJobId: job.id });
}
