import { createServiceClient } from "@/lib/supabase/service";
import { exchangeLinkedInCode, getLinkedInProfile, LI_SCOPES } from "@/lib/oauth/linkedin";
import { vaultStore, vaultUpdate } from "@/lib/oauth/vault";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * GET /api/oauth/linkedin/callback
 *
 * Handles the LinkedIn OAuth 2.0 callback.
 * Same pattern as the X callback: verify state, exchange code, store in Vault,
 * upsert platform_connections, advance onboarding state.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  if (error) {
    return NextResponse.redirect(
      `${origin}/onboarding/connect?error=${encodeURIComponent(
        searchParams.get("error_description") ?? error
      )}`
    );
  }

  // Read + verify state cookie
  const cookieStore = await cookies();
  const rawState = cookieStore.get("li_oauth_state")?.value;
  if (!rawState) {
    return NextResponse.redirect(`${origin}/onboarding/connect?error=state_missing`);
  }

  let savedState: { state: string; founderId: string };
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

  const redirectUri = `${origin}/api/oauth/linkedin/callback`;
  const db = createServiceClient();

  try {
    // Exchange code for tokens
    const tokens = await exchangeLinkedInCode(code, redirectUri);

    // Fetch LinkedIn profile
    const profile = await getLinkedInProfile(tokens.accessToken);

    // Check for existing connection
    const { data: existing } = await db
      .from("platform_connections")
      .select("id, access_token_ref, refresh_token_ref")
      .eq("founder_id", savedState.founderId)
      .eq("platform", "linkedin")
      .single();

    let accessTokenRef: string;
    let refreshTokenRef: string | null = null;

    if (existing?.access_token_ref) {
      await vaultUpdate(existing.access_token_ref, tokens.accessToken);
      accessTokenRef = existing.access_token_ref;
      if (tokens.refreshToken) {
        if (existing.refresh_token_ref) {
          await vaultUpdate(existing.refresh_token_ref, tokens.refreshToken);
          refreshTokenRef = existing.refresh_token_ref;
        } else {
          refreshTokenRef = await vaultStore(
            tokens.refreshToken,
            `li_refresh_${savedState.founderId}`
          );
        }
      }
    } else {
      accessTokenRef = await vaultStore(
        tokens.accessToken,
        `li_access_${savedState.founderId}`
      );
      if (tokens.refreshToken) {
        refreshTokenRef = await vaultStore(
          tokens.refreshToken,
          `li_refresh_${savedState.founderId}`
        );
      }
    }

    // Upsert platform_connections
    await db.from("platform_connections").upsert(
      {
        founder_id: savedState.founderId,
        platform: "linkedin",
        platform_user_id: profile.platformUserId,
        handle: profile.handle,
        status: "active",
        scopes: LI_SCOPES,
        access_token_ref: accessTokenRef,
        refresh_token_ref: refreshTokenRef,
        token_expires_at: tokens.expiresAt?.toISOString() ?? null,
      },
      { onConflict: "founder_id,platform" }
    );

    // Advance onboarding state (only if still at 'connect')
    await db
      .from("founders")
      .update({ onboarding_state: "extension" })
      .eq("id", savedState.founderId)
      .eq("onboarding_state", "connect");

    const response = NextResponse.redirect(`${origin}/onboarding/extension`);
    response.cookies.delete("li_oauth_state");
    return response;
  } catch (err) {
    console.error("[oauth/linkedin/callback]", err);
    // In dev: surface the actual error message in the URL so it shows in the UI
    const detail =
      process.env.NODE_ENV === "development" && err instanceof Error
        ? err.message
        : "connection_failed";
    return NextResponse.redirect(
      `${origin}/onboarding/connect?error=${encodeURIComponent(detail)}`
    );
  }
}
