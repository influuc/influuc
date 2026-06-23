import { createServiceClient } from "@/lib/supabase/service";
import { getCurrentFounder } from "@/lib/founder";
import { NextResponse } from "next/server";

/**
 * POST /api/onboarding/advance-connect
 *
 * Called by the connect page "Continue" button.
 * Verifies both X and LinkedIn are connected, then advances
 * onboarding_state from 'connect' → 'extension'.
 */
export async function POST() {
  let founder;
  try {
    founder = await getCurrentFounder();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = createServiceClient();

  const { data: connections } = await db
    .from("platform_connections")
    .select("platform, status")
    .eq("founder_id", founder.id)
    .in("platform", ["x", "linkedin"])
    .eq("status", "active");

  const platforms = new Set((connections ?? []).map((c) => c.platform));
  const hasX = platforms.has("x");
  const hasLinkedIn = platforms.has("linkedin");

  if (!hasX || !hasLinkedIn) {
    return NextResponse.json(
      { error: `Please connect ${!hasX ? "X" : "LinkedIn"} before continuing.` },
      { status: 400 }
    );
  }

  await db
    .from("founders")
    .update({ onboarding_state: "extension" })
    .eq("id", founder.id)
    .eq("onboarding_state", "connect");

  return NextResponse.json({ ok: true });
}
