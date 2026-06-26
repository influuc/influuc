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

async function callLLM(system: string, user: string): Promise<string | null> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return null;
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", "HTTP-Referer": "https://influuc.com" },
    body: JSON.stringify({
      model: "anthropic/claude-haiku-4-5",
      messages: [{ role: "system", content: system }, { role: "user", content: user }],
      temperature: 0.3, max_tokens: 300,
    }),
  });
  if (!res.ok) return null;
  const j = await res.json() as { choices: [{ message: { content: string } }] };
  return j.choices[0].message.content;
}

export const learningAggregate = schedules.task({
  id: "learning.aggregate",
  cron: "0 17 * * 0", // Sundays 17:00 UTC
  maxDuration: 300,

  run: async () => {
    const db = createDb();
    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 3600 * 1000).toISOString();

    // All metric snapshots in the window, newest first (newest = highest engagement per post)
    const { data: metrics } = await db
      .from("post_metrics")
      .select("post_id, founder_id, likes, reposts, replies, quotes, engagement, collected_at")
      .gte("collected_at", fourteenDaysAgo)
      .order("collected_at", { ascending: false });

    if (!metrics?.length) { logger.info("learning.aggregate: no metrics"); return { founders: 0 }; }

    // Latest snapshot per post
    const latestByPost = new Map<string, typeof metrics[number]>();
    for (const m of metrics) if (!latestByPost.has(m.post_id)) latestByPost.set(m.post_id, m);

    // Group posts by founder
    const byFounder = new Map<string, Array<typeof metrics[number]>>();
    for (const m of latestByPost.values()) {
      const arr = byFounder.get(m.founder_id) ?? [];
      arr.push(m);
      byFounder.set(m.founder_id, arr);
    }

    let updated = 0;

    for (const [founderId, rows] of byFounder) {
      if (rows.length < 3) continue; // not enough signal yet

      const postIds = rows.map((r) => r.post_id);
      const { data: contents } = await db
        .from("weekly_posts")
        .select("id, content, post_type")
        .in("id", postIds);
      const contentMap = new Map((contents ?? []).map((c) => [c.id, c]));

      const ranked = rows
        .map((r) => ({ ...r, content: contentMap.get(r.post_id)?.content ?? "", post_type: contentMap.get(r.post_id)?.post_type ?? "" }))
        .sort((a, b) => b.engagement - a.engagement);

      const top = ranked.slice(0, 3);
      const bottom = ranked.slice(-3).reverse();

      const summary = [
        "TOP PERFORMERS:",
        ...top.map((p, i) => `${i + 1}. [${p.engagement} eng / ${p.likes}♥ ${p.reposts}↻ ${p.replies}💬] ${p.content.slice(0, 180)}`),
        "",
        "LOWEST PERFORMERS:",
        ...bottom.map((p, i) => `${i + 1}. [${p.engagement} eng] ${p.content.slice(0, 180)}`),
      ].join("\n");

      const insight = await callLLM(
        "You analyze a founder's social post performance and extract what actually drives engagement for THEM specifically. Be concrete and specific to the patterns you see — formats, hooks, topics, length, tone. Output 1-2 tight sentences a copywriter could act on. No preamble.",
        `Here are this founder's posts ranked by engagement over the last 2 weeks:\n\n${summary}\n\nWhat content patterns work best for this founder? Give 1-2 actionable sentences.`
      );

      if (!insight) continue;

      // Supersede the previous learned pattern, then insert the fresh one
      await db.from("brain_facts")
        .update({ status: "superseded" })
        .eq("founder_id", founderId)
        .eq("source_kind", "learning")
        .eq("key", "learned_engagement_pattern")
        .eq("status", "active");

      await db.from("brain_facts").insert({
        founder_id: founderId,
        layer: "writing_style",
        key: "learned_engagement_pattern",
        content: insight.trim(),
        confidence: 0.7,
        status: "active",
        source_kind: "learning",
      });

      updated++;
      logger.info("learning.aggregate: insight written", { founderId, insight: insight.trim().slice(0, 120) });
    }

    logger.info("learning.aggregate: done", { updated, founders: byFounder.size });
    return { updated };
  },
});
