import { getCurrentFounder } from "@/lib/founder";
import { generatePKCE, getXAuthUrl } from "@/lib/oauth/x";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import crypto from "crypto";

/**
 * GET /api/oauth/x
 *
 * Initiates the X OAuth 2.0 PKCE flow.
 * Generates a code_verifier + challenge, stores state in a short-lived cookie,
 * then redirects the user to X's authorization endpoint.
 *
 * Required env: X_OAUTH2_CLIENT_ID
 * Register callback in X Developer Portal: {origin}/api/oauth/x/callback
 */
export async function GET(request: NextRequest) {
  const origin = new URL(request.url).origin;

  let founder;
  try {
    founder = await getCurrentFounder();
  } catch {
    return NextResponse.redirect(`${origin}/sign-in`);
  }

  const { codeVerifier, codeChallenge } = generatePKCE();
  const state = crypto.randomBytes(16).toString("hex");
  const redirectUri = `${origin}/api/oauth/x/callback`;

  let authUrl: string;
  try {
    authUrl = getXAuthUrl(state, codeChallenge, redirectUri);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "X OAuth not configured";
    return NextResponse.redirect(
      `${origin}/onboarding/connect?error=${encodeURIComponent(msg)}`
    );
  }

  const returnTo = new URL(request.url).searchParams.get("returnTo") ?? "/onboarding/connect";

  const response = NextResponse.redirect(authUrl);
  // Short-lived state cookie — read back in /api/oauth/x/callback
  response.cookies.set("x_oauth_state", JSON.stringify({ state, codeVerifier, founderId: founder.id, returnTo }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 10, // 10 minutes
    path: "/api/oauth",
  });
  return response;
}
