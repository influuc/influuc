import { createServiceClient } from "@/lib/supabase/service";
import { createClient as createAnonClient } from "@supabase/supabase-js";
import type { Json } from "@influuc/db";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createHash } from "crypto";
import { tasks } from "@trigger.dev/sdk/v3";
import type { brainBootstrap } from "@/trigger/brain-bootstrap";

/**
 * POST /api/ingest/extension
 *
 * Receives scraped profile data from the Influuc Chrome extension.
 * Auth: Supabase access_token passed as Bearer — the same session the
 * user has in their browser. No separate extension token needed.
 */
export async function POST(request: NextRequest) {
  const auth = request.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";

  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify the JWT and get the Supabase user
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const anonClient = createAnonClient(supabaseUrl, supabaseAnonKey);
  const { data: { user }, error: authError } = await anonClient.auth.getUser(token);

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Look up founder via accounts table
  const db = createServiceClient();
  const { data: account } = await db
    .from("accounts")
    .select("id")
    .eq("auth_user_id", user.id)
    .single();

  if (!account) {
    return NextResponse.json({ error: "Account not found" }, { status: 401 });
  }

  const { data: founder } = await db
    .from("founders")
    .select("id, onboarding_state")
    .eq("account_id", (account as { id: string }).id)
    .single();

  if (!founder) {
    return NextResponse.json({ error: "Founder not found" }, { status: 401 });
  }

  const founderId = (founder as { id: string; onboarding_state: string }).id;

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

  const contentHash = createHash("sha256")
    .update(JSON.stringify(data).slice(0, 10_000))
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

  // Advance onboarding state to analysis
  await db
    .from("founders")
    .update({ onboarding_state: "analysis" })
    .eq("id", founderId)
    .in("onboarding_state", ["capture", "extension"]);

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
