import { schedules, logger } from "@trigger.dev/sdk/v3";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@influuc/db";
import { topicsToClusters } from "./discovery-pool";

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

function extractJson<T>(text: string): T | null {
  const start = text.search(/[[{]/);
  if (start === -1) return null;
  const open = text[start];
  const close = open === "[" ? "]" : "}";
  let depth = 0, inStr = false, escaped = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i]!;
    if (escaped) { escaped = false; continue; }
    if (ch === "\\" && inStr) { escaped = true; continue; }
    if (ch === '"') { inStr = !inStr; continue; }
    if (inStr) continue;
    if (ch === open) depth++;
    else if (ch === close) { depth--; if (depth === 0) { try { return JSON.parse(text.slice(start, i + 1)) as T; } catch { return null; } } }
  }
  return null;
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
      temperature: 0.2, max_tokens: 900,
    }),
  });
  if (!res.ok) { logger.warn("assign: LLM error", { status: res.status }); return null; }
  const j = await res.json() as { choices: [{ message: { content: string } }] };
  return j.choices[0].message.content;
}

const VALID_TYPES = new Set(["industry_trend", "market_shift", "breaking_news", "emerging_conversation", "podcast", "partnership", "collaboration", "thought_leadership"]);
const DAILY_QUOTA = 5;

interface RankItem { index: number; type: string; relevance: number; priority: number; should_surface: boolean; match_reason: string | null }

export const opportunityAssign = schedules.task({
  id: "opportunity.assign",
  cron: "30 8 * * *", // 8:30 UTC daily, after pool fill (07:00)
  maxDuration: 300,

  run: async () => {
    const db = createDb();

    const { data: prefs } = await db
      .from("operating_preferences")
      .select("founder_id, focus_topics, content_goals, prohibited_topics")
      .not("focus_topics", "is", null);

    let surfacedTotal = 0;

    for (const p of prefs ?? []) {
      const topics = (p.focus_topics as string[] | null) ?? [];
      if (!topics.length) continue;

      const clusters = topicsToClusters(topics);
      const twoDaysAgo = new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString().slice(0, 10);

      const { data: pool } = await db
        .from("discovery_pool")
        .select("title, summary, source_url, source_kind, published_at, dedupe_hash")
        .in("cluster", clusters)
        .gte("harvested_date", twoDaysAgo)
        .order("published_at", { ascending: false, nullsFirst: false })
        .limit(40);

      if (!pool?.length) continue;

      // Exclude items already surfaced to this founder
      const hashes = pool.map((x) => x.dedupe_hash);
      const { data: existing } = await db
        .from("opportunities")
        .select("dedupe_hash")
        .eq("founder_id", p.founder_id)
        .in("dedupe_hash", hashes);
      const seen = new Set((existing ?? []).map((e) => e.dedupe_hash));

      const candidates = pool.filter((x) => !seen.has(x.dedupe_hash)).slice(0, 15);
      if (!candidates.length) continue;

      const { data: facts } = await db
        .from("brain_facts")
        .select("layer, content")
        .eq("founder_id", p.founder_id)
        .eq("status", "active")
        .order("confidence", { ascending: false })
        .limit(12);

      const founderCtx = [
        `Focus topics: ${topics.join(", ")}`,
        `Goals: ${((p.content_goals as string[] | null) ?? []).join(", ")}`,
        `Avoid: ${((p.prohibited_topics as string[] | null) ?? []).join(", ") || "none"}`,
        `Brain:`,
        ...(facts ?? []).map((f) => `  [${f.layer}] ${f.content}`),
      ].join("\n");

      const list = candidates.map((c, i) => `${i}. ${c.title}${c.summary ? ` — ${c.summary.slice(0, 160)}` : ""}`).join("\n");

      const raw = await callLLM(
        `You match trending news to a founder's brand. From a list of candidate items, pick the ones genuinely worth the founder reacting to. Be selective — most items should NOT surface. Return ONLY a JSON array.`,
        `FOUNDER:\n${founderCtx}\n\nCANDIDATES:\n${list}\n\nReturn a JSON array of the BEST matches (max ${DAILY_QUOTA}), each:\n{"index":N,"type":"breaking_news|emerging_conversation|industry_trend|market_shift|thought_leadership","relevance":0.0-1.0,"priority":0.0-1.0,"should_surface":true,"match_reason":"one sentence why it matters to THIS founder"}\nOnly include items with should_surface true and priority>=0.45. If none qualify, return [].`
      );

      const ranked = extractJson<RankItem[]>(raw ?? "");
      if (!ranked?.length) continue;

      let surfaced = 0;
      for (const r of ranked) {
        if (surfaced >= DAILY_QUOTA) break;
        if (!r.should_surface || (r.priority ?? 0) < 0.45) continue;
        const c = candidates[r.index];
        if (!c) continue;

        const type = VALID_TYPES.has(r.type) ? r.type : "emerging_conversation";
        const clamp = (v: number) => Math.min(1, Math.max(0, v ?? 0));

        const { data: opp, error } = await db.from("opportunities").insert({
          founder_id: p.founder_id,
          type: type as Database["public"]["Enums"]["opp_type"],
          title: c.title.slice(0, 300),
          summary: c.summary,
          source_url: c.source_url,
          discovered_via: `pool:${c.source_kind}`,
          signal_at: c.published_at ?? new Date().toISOString(),
          expires_at: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
          dedupe_hash: c.dedupe_hash,
          relevance_score: clamp(r.relevance),
          priority_score: clamp(r.priority),
          status: "surfaced",
        }).select("id").single();

        if (error) continue; // dup or constraint — skip
        if (opp?.id && r.match_reason) {
          await db.from("opportunity_matches").insert({
            opportunity_id: opp.id,
            founder_id: p.founder_id,
            match_reason: r.match_reason,
            match_score: clamp(r.priority),
          });
        }
        surfaced++;
      }
      surfacedTotal += surfaced;
      if (surfaced) logger.info("assign: founder surfaced", { founderId: p.founder_id, surfaced });
    }

    logger.info("opportunity.assign: done", { surfacedTotal, founders: prefs?.length ?? 0 });
    return { surfacedTotal };
  },
});
