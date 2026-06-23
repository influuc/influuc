import { task, logger } from "@trigger.dev/sdk/v3";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@influuc/db";

if (typeof globalThis.WebSocket === "undefined") {
  // @ts-ignore
  globalThis.WebSocket = class StubWS extends EventTarget {
    static CONNECTING = 0; static OPEN = 1; static CLOSING = 2; static CLOSED = 3;
    readyState = 3; close() {} send() {}
  };
}

function createDb() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

async function vaultRead(db: ReturnType<typeof createDb>, secretId: string): Promise<string> {
  const { data, error } = await db.rpc("vault_read_secret", { p_id: secretId });
  if (error) throw new Error(`Vault read failed: ${error.message}`);
  return data as string;
}

async function vaultUpdate(db: ReturnType<typeof createDb>, secretId: string, secret: string): Promise<void> {
  const { error } = await db.rpc("vault_update_secret", { p_id: secretId, p_secret: secret });
  if (error) throw new Error(`Vault update failed: ${error.message}`);
}

async function refreshAccessToken(platform: "x" | "linkedin", refreshToken: string) {
  if (platform === "x") {
    const credentials = Buffer.from(
      `${process.env.X_OAUTH2_CLIENT_ID!}:${process.env.X_OAUTH2_CLIENT_SECRET!}`
    ).toString("base64");
    const res = await fetch("https://api.twitter.com/2/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", Authorization: `Basic ${credentials}` },
      body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: refreshToken }),
    });
    if (!res.ok) throw new Error(`X token refresh failed (${res.status}): ${await res.text()}`);
    const j = await res.json() as { access_token: string; refresh_token?: string; expires_in?: number };
    return { accessToken: j.access_token, refreshToken: j.refresh_token ?? null, expiresAt: j.expires_in ? new Date(Date.now() + j.expires_in * 1000).toISOString() : null };
  } else {
    const res = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: refreshToken, client_id: process.env.LINKEDIN_CLIENT_ID!, client_secret: process.env.LINKEDIN_CLIENT_SECRET! }),
    });
    if (!res.ok) throw new Error(`LinkedIn token refresh failed (${res.status}): ${await res.text()}`);
    const j = await res.json() as { access_token: string; refresh_token?: string; expires_in?: number };
    return { accessToken: j.access_token, refreshToken: j.refresh_token ?? null, expiresAt: j.expires_in ? new Date(Date.now() + j.expires_in * 1000).toISOString() : null };
  }
}

async function postToX(accessToken: string, text: string): Promise<string> {
  const res = await fetch("https://api.twitter.com/2/tweets", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) throw new Error(`X post failed (${res.status}): ${await res.text()}`);
  const j = await res.json() as { data: { id: string } };
  return j.data.id;
}

async function postToLinkedIn(accessToken: string, personId: string, text: string): Promise<string> {
  const res = await fetch("https://api.linkedin.com/v2/ugcPosts", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "X-Restli-Protocol-Version": "2.0.0",
    },
    body: JSON.stringify({
      author: `urn:li:person:${personId}`,
      lifecycleState: "PUBLISHED",
      specificContent: {
        "com.linkedin.ugc.ShareContent": {
          shareCommentary: { text },
          shareMediaCategory: "NONE",
        },
      },
      visibility: { "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC" },
    }),
  });
  if (!res.ok) throw new Error(`LinkedIn post failed (${res.status}): ${await res.text()}`);
  return res.headers.get("x-restli-id") ?? "unknown";
}

export type PostPublishPayload = { postId: string; founderId: string };

export const postPublish = task({
  id: "post.publish",
  maxDuration: 60,
  retry: { maxAttempts: 3, minTimeoutInMs: 5000, maxTimeoutInMs: 60000, factor: 2 },

  // After all retries exhausted, mark the post as failed so the founder can see it
  handleError: async ({ payload, error }) => {
    const db = createDb();
    await db
      .from("weekly_posts")
      .update({ status: "failed" })
      .eq("id", payload.postId)
      .eq("status", "scheduled");
    logger.error("post.publish: permanently failed", { postId: payload.postId, error: String(error) });
  },

  run: async (payload: PostPublishPayload) => {
    const { postId, founderId } = payload;
    const db = createDb();

    const { data: post, error: postErr } = await db
      .from("weekly_posts")
      .select("id, founder_id, platform, post_type, content, status")
      .eq("id", postId)
      .eq("founder_id", founderId)
      .single();

    if (postErr || !post) throw new Error(`Post not found: ${postId}`);

    if (post.status === "published") {
      logger.info("post.publish: already published, skipping", { postId });
      return { skipped: true, reason: "already_published" };
    }
    if (post.status !== "scheduled") {
      logger.warn("post.publish: post not in scheduled state", { postId, status: post.status });
      return { skipped: true, reason: `unexpected_status_${post.status}` };
    }

    const { data: conn, error: connErr } = await db
      .from("platform_connections")
      .select("access_token_ref, refresh_token_ref, token_expires_at, platform_user_id")
      .eq("founder_id", founderId)
      .eq("platform", post.platform as "x" | "linkedin")
      .eq("status", "active")
      .single();

    if (connErr || !conn || !conn.access_token_ref) {
      throw new Error(`No active ${post.platform} connection for founder ${founderId}`);
    }

    const platform = post.platform as "x" | "linkedin";

    // Refresh token if expired (or expiring within 5 min)
    let accessToken = await vaultRead(db, conn.access_token_ref);
    const expiresAt = conn.token_expires_at ? new Date(conn.token_expires_at) : null;

    if (expiresAt && expiresAt.getTime() < Date.now() + 5 * 60 * 1000 && conn.refresh_token_ref) {
      logger.info("post.publish: refreshing token", { platform });
      const rt = await vaultRead(db, conn.refresh_token_ref);
      const refreshed = await refreshAccessToken(platform, rt);

      await vaultUpdate(db, conn.access_token_ref, refreshed.accessToken);
      if (refreshed.refreshToken && conn.refresh_token_ref) {
        await vaultUpdate(db, conn.refresh_token_ref, refreshed.refreshToken);
      }
      await db.from("platform_connections")
        .update({ token_expires_at: refreshed.expiresAt })
        .eq("founder_id", founderId)
        .eq("platform", platform);

      accessToken = refreshed.accessToken;
    }

    // Publish
    let platformPostId: string;
    const personId = conn.platform_user_id ?? "";

    if (platform === "x") {
      platformPostId = await postToX(accessToken, post.content);
    } else {
      platformPostId = await postToLinkedIn(accessToken, personId, post.content);
    }

    await db
      .from("weekly_posts")
      .update({ status: "published", published_at: new Date().toISOString() })
      .eq("id", postId);

    logger.info("post.publish: done", { postId, platformPostId, platform });
    return { platformPostId, platform };
  },
});
