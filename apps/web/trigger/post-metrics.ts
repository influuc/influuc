import { schedules, logger } from "@trigger.dev/sdk/v3";
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

type Db = ReturnType<typeof createDb>;

async function vaultRead(db: Db, secretId: string): Promise<string> {
  const { data, error } = await db.rpc("vault_read_secret", { p_id: secretId });
  if (error) throw new Error(`Vault read failed: ${error.message}`);
  return data as string;
}

async function vaultUpdate(db: Db, secretId: string, secret: string): Promise<void> {
  await db.rpc("vault_update_secret", { p_id: secretId, p_secret: secret });
}

async function refreshX(refreshToken: string) {
  const credentials = Buffer.from(
    `${process.env.X_OAUTH2_CLIENT_ID!}:${process.env.X_OAUTH2_CLIENT_SECRET!}`
  ).toString("base64");
  const res = await fetch("https://api.twitter.com/2/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Authorization: `Basic ${credentials}` },
    body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: refreshToken }),
  });
  if (!res.ok) throw new Error(`X refresh failed (${res.status})`);
  const j = await res.json() as { access_token: string; refresh_token?: string; expires_in?: number };
  return {
    accessToken: j.access_token,
    refreshToken: j.refresh_token ?? null,
    expiresAt: j.expires_in ? new Date(Date.now() + j.expires_in * 1000).toISOString() : null,
  };
}

/** Get a valid X access token for a founder, refreshing + persisting if needed. */
async function getXToken(db: Db, founderId: string): Promise<string | null> {
  const { data: conn } = await db
    .from("platform_connections")
    .select("access_token_ref, refresh_token_ref, token_expires_at")
    .eq("founder_id", founderId)
    .eq("platform", "x")
    .eq("status", "active")
    .single();

  if (!conn?.access_token_ref) return null;

  const expiresAt = conn.token_expires_at ? new Date(conn.token_expires_at) : null;
  if (expiresAt && expiresAt.getTime() < Date.now() + 5 * 60 * 1000 && conn.refresh_token_ref) {
    try {
      const rt = await vaultRead(db, conn.refresh_token_ref);
      const r = await refreshX(rt);
      await vaultUpdate(db, conn.access_token_ref, r.accessToken);
      if (r.refreshToken) await vaultUpdate(db, conn.refresh_token_ref, r.refreshToken);
      await db.from("platform_connections").update({ token_expires_at: r.expiresAt }).eq("founder_id", founderId).eq("platform", "x");
      return r.accessToken;
    } catch (e) {
      logger.warn("post.metrics: token refresh failed", { founderId, err: String(e) });
      return null;
    }
  }
  return vaultRead(db, conn.access_token_ref);
}

interface XMetrics { retweet_count: number; reply_count: number; like_count: number; quote_count: number; impression_count?: number }

export const postMetrics = schedules.task({
  id: "post.metrics",
  cron: "0 16 * * 0", // Sundays 16:00 UTC — once weekly, right before learning.aggregate (17:00)
  maxDuration: 300,

  run: async () => {
    const db = createDb();
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();

    // Published X posts from the last 7 days that have a platform id
    const { data: posts, error } = await db
      .from("weekly_posts")
      .select("id, founder_id, platform_post_id")
      .eq("platform", "x")
      .eq("status", "published")
      .not("platform_post_id", "is", null)
      .gte("published_at", sevenDaysAgo);

    if (error) throw new Error(`metrics query failed: ${error.message}`);
    if (!posts?.length) { logger.info("post.metrics: nothing to collect"); return { collected: 0 }; }

    // Group by founder
    const byFounder = new Map<string, typeof posts>();
    for (const p of posts) {
      const arr = byFounder.get(p.founder_id) ?? [];
      arr.push(p);
      byFounder.set(p.founder_id, arr);
    }

    let collected = 0;

    for (const [founderId, fposts] of byFounder) {
      const token = await getXToken(db, founderId);
      if (!token) continue;

      // X allows up to 100 ids per request
      for (let i = 0; i < fposts.length; i += 100) {
        const batch = fposts.slice(i, i + 100);
        const idToPost = new Map(batch.map((p) => [p.platform_post_id!, p.id]));
        const ids = batch.map((p) => p.platform_post_id).join(",");

        const res = await fetch(
          `https://api.twitter.com/2/tweets?ids=${ids}&tweet.fields=public_metrics`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!res.ok) {
          logger.warn("post.metrics: X fetch failed", { founderId, status: res.status });
          continue;
        }

        const body = await res.json() as { data?: Array<{ id: string; public_metrics: XMetrics }> };
        for (const t of body.data ?? []) {
          const postId = idToPost.get(t.id);
          if (!postId) continue;
          const m = t.public_metrics;
          const engagement = (m.like_count ?? 0) + (m.retweet_count ?? 0) + (m.reply_count ?? 0) + (m.quote_count ?? 0);
          await db.from("post_metrics").insert({
            post_id: postId,
            founder_id: founderId,
            platform: "x",
            likes: m.like_count ?? 0,
            reposts: m.retweet_count ?? 0,
            replies: m.reply_count ?? 0,
            quotes: m.quote_count ?? 0,
            impressions: m.impression_count ?? null,
            engagement,
          });
          collected++;
        }
      }
    }

    logger.info("post.metrics: done", { collected, founders: byFounder.size });
    return { collected };
  },
});
