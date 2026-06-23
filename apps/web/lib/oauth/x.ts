import crypto from "crypto";

const X_AUTH_URL = "https://twitter.com/i/oauth2/authorize";
const X_TOKEN_URL = "https://api.twitter.com/2/oauth2/token";
const X_USER_URL = "https://api.twitter.com/2/users/me";

/**
 * OAuth 2.0 scopes — identity + publish requested together (one grant).
 * offline.access = refresh token.
 */
export const X_SCOPES = [
  "tweet.read",
  "tweet.write",
  "users.read",
  "offline.access",
];

export interface XTokens {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: Date | null;
}

export interface XProfile {
  platformUserId: string;
  handle: string;
  name: string;
  profileUrl: string;
}

/** Generate a PKCE code_verifier + code_challenge pair. */
export function generatePKCE(): { codeVerifier: string; codeChallenge: string } {
  const codeVerifier = crypto.randomBytes(32).toString("base64url");
  const codeChallenge = crypto
    .createHash("sha256")
    .update(codeVerifier)
    .digest("base64url");
  return { codeVerifier, codeChallenge };
}

/** Build the X OAuth 2.0 authorization URL. */
export function getXAuthUrl(
  state: string,
  codeChallenge: string,
  redirectUri: string
): string {
  const clientId = process.env.X_OAUTH2_CLIENT_ID;
  if (!clientId) throw new Error("X_OAUTH2_CLIENT_ID is not set. Get it from X Developer Portal → App → OAuth 2.0.");

  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: X_SCOPES.join(" "),
    state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  });

  return `${X_AUTH_URL}?${params.toString()}`;
}

/** Exchange an authorization code + PKCE verifier for X tokens. */
export async function exchangeXCode(
  code: string,
  codeVerifier: string,
  redirectUri: string
): Promise<XTokens> {
  const clientId = process.env.X_OAUTH2_CLIENT_ID;
  const clientSecret = process.env.X_OAUTH2_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("X_OAUTH2_CLIENT_ID or X_OAUTH2_CLIENT_SECRET is not set");
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const res = await fetch(X_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${credentials}`,
    },
    body: new URLSearchParams({
      code,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
      code_verifier: codeVerifier,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`X token exchange failed (${res.status}): ${body}`);
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

/** Fetch the authenticated user's X profile. */
export async function getXProfile(accessToken: string): Promise<XProfile> {
  const res = await fetch(
    `${X_USER_URL}?user.fields=username,name`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!res.ok) throw new Error(`Failed to fetch X profile (${res.status})`);

  const json = (await res.json()) as {
    data: { id: string; username: string; name: string };
  };

  return {
    platformUserId: json.data.id,
    handle: `@${json.data.username}`,
    name: json.data.name,
    profileUrl: `https://x.com/${json.data.username}`,
  };
}

/** Refresh an X access token using the stored refresh token. */
export async function refreshXToken(refreshToken: string): Promise<XTokens> {
  const clientId = process.env.X_OAUTH2_CLIENT_ID;
  const clientSecret = process.env.X_OAUTH2_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("X OAuth 2.0 credentials not set");
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const res = await fetch(X_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${credentials}`,
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  if (!res.ok) throw new Error(`X token refresh failed (${res.status})`);

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
