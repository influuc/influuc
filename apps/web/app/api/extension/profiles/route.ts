import { createServiceClient } from "@/lib/supabase/service";
import { verifyExtensionToken } from "@/lib/extension-token";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * GET /api/extension/profiles
 *
 * Returns the founder's X and LinkedIn handles so the extension
 * background worker can construct profile URLs for auto-scraping.
 */
export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  const verified = verifyExtensionToken(token);
  if (!verified) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = createServiceClient();
  const { data: connections } = await db
    .from("platform_connections")
    .select("platform, handle")
    .eq("founder_id", verified.founderId)
    .eq("status", "active")
    .in("platform", ["x", "linkedin"]);

  const map = Object.fromEntries((connections ?? []).map((c) => [c.platform, c.handle]));

  return NextResponse.json({
    xHandle: map["x"] ?? null,
    linkedinHandle: map["linkedin"] ?? null,
  });
}
