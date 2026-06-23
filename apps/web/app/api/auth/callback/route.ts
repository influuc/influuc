import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Auth callback — handles both magic-link and Google OAuth flows.
 *
 * Supabase redirects here after a sign-in attempt with ?code= (PKCE).
 * We exchange the code for a session, then route the user to:
 *   - ?next= (if provided, e.g. from the middleware redirect)
 *   - /onboarding/connect  (new users, default)
 *
 * For returning users whose founder.onboarding_state is 'done',
 * the onboarding layout will redirect them to /dashboard.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/onboarding/connect";
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  if (error) {
    const msg = errorDescription ?? error;
    return NextResponse.redirect(
      `${origin}/sign-in?error=${encodeURIComponent(msg)}`
    );
  }

  if (code) {
    const supabase = await createClient();
    const { error: exchangeError } =
      await supabase.auth.exchangeCodeForSession(code);

    if (!exchangeError) {
      // DB trigger (migration 0005) has already provisioned
      // accounts + founders + operating_preferences + trial subscription.
      return NextResponse.redirect(`${origin}${next}`);
    }

    return NextResponse.redirect(
      `${origin}/sign-in?error=${encodeURIComponent(
        exchangeError.message ?? "auth_callback_failed"
      )}`
    );
  }

  // No code and no error — shouldn't happen, but handle gracefully.
  return NextResponse.redirect(`${origin}/sign-in?error=missing_code`);
}
