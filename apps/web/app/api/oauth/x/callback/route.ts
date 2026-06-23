import { createServiceClient } from "@/lib/supabase/service";
import { exchangeXCode, getXProfile, X_SCOPES } from "@/lib/oauth/x";
import { vaultStore, vaultUpdate } from "@/lib/oauth/vault";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * GET /api/oauth/x/callback
 *
 * Handles the X OAuth 2.0 callback after the user authorizes.
 * 1. Verifies state to prevent CSRF
 * 2. Exchanges code + PKCE verifier for tokens
 * 3. Fetches X profile to get handle + user ID
 * 4. Stores tokens in Supabase Vault (encrypted)
 * 5. Upserts platform_connections row
 * 6. Advances onboarding_state → 'extension'
 * 7. Redirects to /onboarding/extension
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  if (error) {
    return NextResponse.redirect(
      `${origin}/onboarding/connect?error=${encodeURIComponent(error)}`
    );
  }

  // Read + verify state cookie
  const cookieStore = await cookies();
  const rawState = cookieStore.get("x_oauth_state")?.value;
  if (!rawState) {
    return NextResponse.redirect(`${origin}/onboarding/connect?error=state_missing`);
  }

  let savedState: { state: string; codeVerifier: string; founderId: string };
  try {
    savedState = JSON.parse(rawState);
  } catch {
    return NextResponse.redirect(`${origin}/onboarding/connect?error=state_invalid`);
  }

  if (savedState.state !== state) {
    return NextResponse.redirect(`${origin}/onboarding/connect?error=state_mismatch`);
  }

  if (!code) {
    return NextResponse.redirect(`${origin}/onboarding/connect?error=missing_code`);
  }

  const redirectUri = `${origin}/api/oauth/x/callback`;
  const db = createServiceClient();

  try {
    // Exchange code for tokens
    const tokens = await exchangeXCode(code, savedState.codeVerifier, redirectUri);

    // Fetch X profile
    const profile = await getXProfile(tokens.accessToken);

    // Check for existing connection (re-auth case)
    const { data: existing } = await db
      .from("platform_connections")
      .select("id, access_token_ref, refresh_token_ref")
      .eq("founder_id", savedState.founderId)
      .eq("platform", "x")
      .single();

    let accessTokenRef: string;
    let refreshTokenRef: string | null = null;

    if (existing?.access_token_ref) {
      // Re-auth: update existing Vault secrets
      await vaultUpdate(existing.access_token_ref, tokens.accessToken);
      accessTokenRef = existing.access_token_ref;
      if (tokens.refreshToken) {
        if (existing.refresh_token_ref) {
          await vaultUpdate(existing.refresh_token_ref, tokens.refreshToken);
          refreshTokenRef = existing.refresh_token_ref;
        } else {
          refreshTokenRef = await vaultStore(
            tokens.refreshToken,
            `x_refresh_${savedState.founderId}`
          );
        }
      }
    } else {
      // First connection: create new Vault secrets
      accessTokenRef = await vaultStore(
        tokens.accessToken,
        `x_access_${savedState.founderId}`
      );
      if (tokens.refreshToken) {
        refreshTokenRef = await vaultStore(
          tokens.refreshToken,
          `x_refresh_${savedState.founderId}`
        );
      }
    }

    // Upsert platform_connections
    await db.from("platform_connections").upsert(
      {
        founder_id: savedState.founderId,
        platform: "x",
        platform_user_id: profile.platformUserId,
        handle: profile.handle,
        status: "active",
        scopes: X_SCOPES,
        access_token_ref: accessTokenRef,
        refresh_token_ref: refreshTokenRef,
        token_expires_at: tokens.expiresAt?.toISOString() ?? null,
      },
      { onConflict: "founder_id,platform" }
    );

    // Redirect back to connect so user can also connect LinkedIn
    const response = NextResponse.redirect(`${origin}/onboarding/connect`);
    response.cookies.delete("x_oauth_state");
    return response;
  } catch (err) {
    console.error("[oauth/x/callback]", err);
    return NextResponse.redirect(
      `${origin}/onboarding/connect?error=connection_failed`
    );
  }
}
