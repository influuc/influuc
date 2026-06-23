import { getCurrentFounder } from "@/lib/founder";
import { getLinkedInAuthUrl } from "@/lib/oauth/linkedin";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import crypto from "crypto";

/**
 * GET /api/oauth/linkedin
 *
 * Initiates the LinkedIn OAuth 2.0 flow.
 * Stores state in a short-lived cookie, redirects to LinkedIn's auth endpoint.
 *
 * Required env: LINKEDIN_CLIENT_ID, LINKEDIN_CLIENT_SECRET
 * Register callback in LinkedIn Developer Portal: {origin}/api/oauth/linkedin/callback
 */
export async function GET(request: NextRequest) {
  const origin = new URL(request.url).origin;

  let founder;
  try {
    founder = await getCurrentFounder();
  } catch {
    return NextResponse.redirect(`${origin}/sign-in`);
  }

  const state = crypto.randomBytes(16).toString("hex");
  const redirectUri = `${origin}/api/oauth/linkedin/callback`;

  let authUrl: string;
  try {
    authUrl = getLinkedInAuthUrl(state, redirectUri);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "LinkedIn OAuth not configured";
    return NextResponse.redirect(
      `${origin}/onboarding/connect?error=${encodeURIComponent(msg)}`
    );
  }

  const response = NextResponse.redirect(authUrl);
  response.cookies.set(
    "li_oauth_state",
    JSON.stringify({ state, founderId: founder.id }),
    {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 10, // 10 minutes
      path: "/api/oauth",
    }
  );
  return response;
}
