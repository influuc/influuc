const LI_AUTH_URL = "https://www.linkedin.com/oauth/v2/authorization";
const LI_TOKEN_URL = "https://www.linkedin.com/oauth/v2/accessToken";
const LI_USERINFO_URL = "https://api.linkedin.com/v2/userinfo";

/**
 * LinkedIn OAuth 2.0 scopes — identity + publish requested together (one grant).
 * Note: profile *reading* comes from the extension (own-session scrape),
 * NOT from r_liteprofile/r_emailaddress API scopes.
 */
export const LI_SCOPES = ["openid", "profile", "email", "w_member_social"];

export interface LinkedInTokens {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: Date | null;
}

export interface LinkedInProfile {
  platformUserId: string;
  handle: string;
  name: string;
  email: string;
}

/** Build the LinkedIn OAuth 2.0 authorization URL. */
export function getLinkedInAuthUrl(state: string, redirectUri: string): string {
  const clientId = process.env.LINKEDIN_CLIENT_ID;
  if (!clientId) throw new Error("LINKEDIN_CLIENT_ID is not set");

  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: LI_SCOPES.join(" "),
    state,
  });

  return `${LI_AUTH_URL}?${params.toString()}`;
}

/** Exchange an authorization code for LinkedIn tokens. */
export async function exchangeLinkedInCode(
  code: string,
  redirectUri: string
): Promise<LinkedInTokens> {
  const clientId = process.env.LINKEDIN_CLIENT_ID;
  const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("LINKEDIN_CLIENT_ID or LINKEDIN_CLIENT_SECRET is not set");
  }

  const res = await fetch(LI_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`LinkedIn token exchange failed (${res.status}): ${body}`);
  }

  const json = (await res.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
  };

  return {
    accessToken: json.access_token,
    refreshToken: json.refresh_token ?? null,
    expiresAt: json.expires_in
      ? new Date(Date.now() + json.expires_in * 1000)
      : null,
  };
}

/** Fetch the authenticated user's LinkedIn profile via OpenID Connect. */
export async function getLinkedInProfile(
  accessToken: string
): Promise<LinkedInProfile> {
  const res = await fetch(LI_USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) throw new Error(`Failed to fetch LinkedIn profile (${res.status})`);

  const json = (await res.json()) as {
    sub: string;
    name: string;
    email: string;
  };

  return {
    platformUserId: json.sub,
    handle: json.name, // LinkedIn uses full name (no @handle)
    name: json.name,
    email: json.email,
  };
}

/** Refresh a LinkedIn access token. */
export async function refreshLinkedInToken(
  refreshToken: string
): Promise<LinkedInTokens> {
  const clientId = process.env.LINKEDIN_CLIENT_ID;
  const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("LinkedIn credentials not set");
  }

  const res = await fetch(LI_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  if (!res.ok) throw new Error(`LinkedIn token refresh failed (${res.status})`);

  const json = (await res.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
  };

  return {
    accessToken: json.access_token,
    refreshToken: json.refresh_token ?? null,
    expiresAt: json.expires_in
      ? new Date(Date.now() + json.expires_in * 1000)
      : null,
  };
}
