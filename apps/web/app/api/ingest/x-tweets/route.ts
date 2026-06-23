import { createServiceClient } from "@/lib/supabase/service";
import { getCurrentFounder } from "@/lib/founder";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createHash } from "crypto";
import { tasks } from "@trigger.dev/sdk/v3";
import type { brainBootstrap } from "@/trigger/brain-bootstrap";

/**
 * POST /api/ingest/x-tweets
 *
 * Fetches the founder's recent X/Twitter posts using their stored connection,
 * saves them as a raw_source, and triggers brain.bootstrap.
 *
 * No body required — resolves the founder's X connection from their session.
 * Returns: { rawSourceId, extractionJobId }
 */
export async function POST(_request: NextRequest) {
  let founder;
  try {
    founder = await getCurrentFounder();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const bearerToken = process.env.X_BEARER_TOKEN;
  if (!bearerToken) {
    return NextResponse.json({ error: "X API not configured" }, { status: 503 });
  }

  const db = createServiceClient();

  // Find the founder's X connection
  const { data: conn } = await db
    .from("platform_connections")
    .select("platform_user_id, handle")
    .eq("founder_id", founder.id)
    .eq("platform", "x")
    .eq("status", "active")
    .single();

  if (!conn?.platform_user_id) {
    return NextResponse.json({ error: "X account not connected" }, { status: 400 });
  }

  // Fetch recent tweets via X API v2
  let tweets: Array<{ id: string; text: string; created_at?: string }> = [];
  try {
    const xRes = await fetch(
      `https://api.twitter.com/2/users/${conn.platform_user_id}/tweets?max_results=20&tweet.fields=text,created_at&exclude=retweets,replies`,
      {
        headers: { Authorization: `Bearer ${bearerToken}` },
        signal: AbortSignal.timeout(20_000),
      }
    );
    if (xRes.ok) {
      const xData = (await xRes.json()) as {
        data?: Array<{ id: string; text: string; created_at?: string }>;
      };
      tweets = xData.data ?? [];
    } else {
      const errText = await xRes.text();
      console.error("[ingest/x-tweets] X API error:", xRes.status, errText);
      return NextResponse.json({ error: "Failed to fetch tweets" }, { status: 502 });
    }
  } catch (err) {
    console.error("[ingest/x-tweets] fetch error:", err);
    return NextResponse.json({ error: "Failed to reach X API" }, { status: 502 });
  }

  if (tweets.length === 0) {
    return NextResponse.json({ error: "No tweets found for this account" }, { status: 422 });
  }

  const username = (conn.handle ?? "").replace(/^@/, "");
  const raw = { tweets, username, platform_user_id: conn.platform_user_id };
  const contentHash = createHash("sha256")
    .update(tweets.map((t) => t.id).join(","))
    .digest("hex");

  // Upsert raw_source
  const { data: rawSource, error: rsError } = await db
    .from("raw_sources")
    .upsert(
      {
        founder_id: founder.id,
        kind: "x",
        url: `https://twitter.com/${username}`,
        raw,
        content_hash: contentHash,
        captured_by: "x_api",
      },
      { onConflict: "founder_id,content_hash", ignoreDuplicates: false }
    )
    .select("id")
    .single();

  if (rsError || !rawSource) {
    console.error("[ingest/x-tweets] raw_source upsert failed:", rsError);
    return NextResponse.json({ error: "Failed to save source" }, { status: 500 });
  }

  // Create extraction_job
  const { data: job, error: jobError } = await db
    .from("extraction_jobs")
    .insert({ founder_id: founder.id, raw_source_id: rawSource.id, status: "queued" })
    .select("id")
    .single();

  if (jobError || !job) {
    console.error("[ingest/x-tweets] extraction_job insert failed:", jobError);
    return NextResponse.json({ error: "Failed to queue job" }, { status: 500 });
  }

  // Advance onboarding state to 'analysis' if still at 'capture'
  await db
    .from("founders")
    .update({ onboarding_state: "analysis" })
    .eq("id", founder.id)
    .eq("onboarding_state", "capture");

  // Trigger brain.bootstrap
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
    console.warn("[ingest/x-tweets] brain.bootstrap trigger failed:", err);
  }

  return NextResponse.json({ rawSourceId: rawSource.id, extractionJobId: job.id });
}
