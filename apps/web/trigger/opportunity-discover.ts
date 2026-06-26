import { schedules, task, logger, tasks } from "@trigger.dev/sdk/v3";
import { createClient } from "@supabase/supabase-js";
import { createHash } from "node:crypto";
import type { Database } from "@influuc/db";
import type { opportunityScore } from "./opportunity-score";

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

interface ExaResult {
  title: string;
  url: string;
  publishedDate?: string;
  text?: string;
  summary?: string;
}

async function searchExa(query: string, numResults = 5): Promise<ExaResult[]> {
  const apiKey = process.env.EXA_API_KEY;
  if (!apiKey) {
    logger.warn("EXA_API_KEY not configured — skipping discovery");
    return [];
  }

  const cutoff = new Date(Date.now() - 48 * 3600 * 1000).toISOString();

  const res = await fetch("https://api.exa.ai/search", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": apiKey },
    body: JSON.stringify({
      query,
      numResults,
      startPublishedDate: cutoff,
      type: "neural",
      contents: { text: { maxCharacters: 600 }, summary: { query } },
    }),
  });

  if (!res.ok) {
    logger.warn(`Exa search failed: ${res.status}`);
    return [];
  }

  const data = await res.json() as { results: ExaResult[] };
  return data.results ?? [];
}

// ── Per-founder discovery ────────────────────────────────────────────────────

export type DiscoverPayload = { founderId: string; focusTopics: string[] };

export const opportunityDiscover = task({
  id: "opportunity.discover",
  maxDuration: 120,
  retry: { maxAttempts: 2 },

  run: async ({ founderId, focusTopics }: DiscoverPayload) => {
    if (!focusTopics.length) return { discovered: 0 };

    const db = createDb();

    // Build 2 query types per topic (max 8 queries total)
    const queries: Array<{ q: string; type: "breaking_news" | "emerging_conversation" | "industry_trend" }> = [
      ...focusTopics.slice(0, 3).map(t => ({
        q: `breaking news ${t}`,
        type: "breaking_news" as const,
      })),
      ...focusTopics.slice(0, 3).map(t => ({
        q: `trending discussion ${t} founders`,
        type: "emerging_conversation" as const,
      })),
      ...focusTopics.slice(0, 2).map(t => ({
        q: `${t} industry trend 2025`,
        type: "industry_trend" as const,
      })),
    ];

    let discovered = 0;

    for (const { q, type } of queries) {
      const results = await searchExa(q, 3);

      for (const r of results) {
        if (!r.url || !r.title) continue;

        const dedupeHash = createHash("sha256")
          .update(`${founderId}:${r.url}`)
          .digest("hex")
          .slice(0, 32);

        const { data: inserted, error } = await db
          .from("opportunities")
          .insert({
            founder_id: founderId,
            type,
            title: r.title.slice(0, 300),
            summary: r.summary ?? r.text?.slice(0, 500) ?? null,
            source_url: r.url,
            discovered_via: "exa",
            signal_at: r.publishedDate ?? new Date().toISOString(),
            expires_at: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
            dedupe_hash: dedupeHash,
            status: "discovered",
          })
          .select("id")
          .single();

        if (error) {
          if (error.code === "23505") continue; // already discovered this URL for this founder
          logger.warn("opportunity.discover: insert error", { message: error.message });
          continue;
        }

        if (inserted?.id) {
          await tasks.trigger<typeof opportunityScore>("opportunity.score", {
            opportunityId: inserted.id,
            founderId,
          });
          discovered++;
        }
      }
    }

    logger.info("opportunity.discover: done", { founderId, discovered });
    return { discovered };
  },
});

// ── Daily cron — fires per-founder discovery ─────────────────────────────────

export const opportunityDiscoverCron = schedules.task({
  id: "opportunity.discover.cron",
  cron: "0 8 * * *", // 8:00 UTC = 1:30 PM IST
  maxDuration: 300,

  run: async () => {
    const db = createDb();

    const { data: prefs, error } = await db
      .from("operating_preferences")
      .select("founder_id, focus_topics");

    if (error) throw new Error(`Failed to load preferences: ${error.message}`);

    let triggered = 0;
    for (const p of prefs ?? []) {
      const topics = p.focus_topics as string[] | null;
      if (!topics?.length) continue;

      await tasks.trigger<typeof opportunityDiscover>("opportunity.discover", {
        founderId: p.founder_id,
        focusTopics: topics,
      });
      triggered++;
    }

    logger.info("opportunity.discover.cron: done", { triggered });
    return { triggered };
  },
});
