import { getCurrentFounder } from "@/lib/founder";
import { mintExtensionToken } from "@/lib/extension-token";
import { NextResponse } from "next/server";

/**
 * GET /api/extension/token
 *
 * Mints a short-lived (15 min) HMAC-signed token scoped to `ingest`.
 * The extension exchanges this for access to /api/ingest/extension.
 * Called by the /extension-auth bridge page after the user authenticates.
 */
export async function GET() {
  let founder;
  try {
    founder = await getCurrentFounder();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.EXTENSION_TOKEN_SECRET) {
    return NextResponse.json({ error: "Extension not configured" }, { status: 503 });
  }

  const token = mintExtensionToken(founder.id);
  return NextResponse.json({ token, founderId: founder.id });
}
