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

async function callOpenRouter(system: string, user: string): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY not set");

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://influuc.com",
    },
    body: JSON.stringify({
      model: "anthropic/claude-haiku-4-5",
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      temperature: 0.1,
      max_tokens: 400,
    }),
  });

  if (!res.ok) throw new Error(`OpenRouter error (${res.status}): ${await res.text()}`);
  const j = await res.json() as { choices: [{ message: { content: string } }] };
  return j.choices[0].message.content;
}

function extractJson<T>(text: string): T | null {
  const start = text.indexOf("{");
  if (start === -1) return null;
  let depth = 0, inStr = false, escaped = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i]!;
    if (escaped) { escaped = false; continue; }
    if (ch === "\\" && inStr) { escaped = true; continue; }
    if (ch === '"') { inStr = !inStr; continue; }
    if (inStr) continue;
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) {
        try { return JSON.parse(text.slice(start, i + 1)) as T; } catch { return null; }
      }
    }
  }
  return null;
}

export type OpportunityScorePayload = { opportunityId: string; founderId: string };

export const opportunityScore = task({
  id: "opportunity.score",
  maxDuration: 60,
  retry: { maxAttempts: 3, minTimeoutInMs: 2000, factor: 2 },

  run: async ({ opportunityId, founderId }: OpportunityScorePayload) => {
    const db = createDb();

    const { data: opp } = await db
      .from("opportunities")
      .select("*")
      .eq("id", opportunityId)
      .single();

    if (!opp) throw new Error(`Opportunity not found: ${opportunityId}`);
    if (opp.status !== "discovered") {
      logger.info("opportunity.score: already processed", { opportunityId, status: opp.status });
      return { skipped: true };
    }

    const [{ data: facts }, { data: prefs }] = await Promise.all([
      db
        .from("brain_facts")
        .select("layer, key, content, confidence")
        .eq("founder_id", founderId)
        .eq("status", "active")
        .order("confidence", { ascending: false })
        .limit(12),
      db
        .from("operating_preferences")
        .select("focus_topics, content_goals, prohibited_topics, tone")
        .eq("founder_id", founderId)
        .single(),
    ]);

    const founderCtx = [
      `Focus topics: ${(prefs?.focus_topics as string[] ?? []).join(", ")}`,
      `Goals: ${(prefs?.content_goals as string[] ?? []).join(", ")}`,
      `Prohibited: ${(prefs?.prohibited_topics as string[] ?? []).join(", ") || "none"}`,
      `Key facts:`,
      ...(facts ?? []).map(f => `  - [${f.layer}] ${f.key ?? "fact"}: ${f.content}`),
    ].join("\n");

    const system = `You are a content strategy AI scoring opportunities for a personal brand founder.
Return ONLY valid JSON — no markdown, no explanation.`;

    const user = `Founder profile:
${founderCtx}

Opportunity:
Title: ${opp.title}
Summary: ${opp.summary ?? "N/A"}
Source: ${opp.source_url ?? "N/A"}
Type: ${opp.type}

Score this (0.0–1.0 each):
- relevance_score: how well this matches founder's topics and expertise
- urgency_score: how time-sensitive (1.0 = breaking, 0.0 = evergreen)
- priority_score: overall priority combining relevance, urgency, and actionability
- match_reason: one crisp sentence why this matters for this founder (null if not relevant)
- should_surface: true if priority_score >= 0.45 and not about prohibited topics

Return JSON: {"relevance_score":0.0,"urgency_score":0.0,"priority_score":0.0,"match_reason":"...","should_surface":true}`;

    const raw = await callOpenRouter(system, user);

    interface ScoreResult {
      relevance_score: number;
      urgency_score: number;
      priority_score: number;
      match_reason: string | null;
      should_surface: boolean;
    }

    const scored = extractJson<ScoreResult>(raw);

    if (!scored) {
      logger.warn("opportunity.score: LLM parse failed", { opportunityId, raw: raw.slice(0, 200) });
      await db.from("opportunities").update({ status: "expired" }).eq("id", opportunityId);
      return { error: "parse_failed" };
    }

    const clamp = (v: number) => Math.min(1, Math.max(0, v ?? 0));
    const newStatus = scored.should_surface ? "surfaced" as const : "expired" as const;

    await db
      .from("opportunities")
      .update({
        relevance_score: clamp(scored.relevance_score),
        urgency_score: clamp(scored.urgency_score),
        priority_score: clamp(scored.priority_score),
        status: newStatus,
      })
      .eq("id", opportunityId);

    if (newStatus === "surfaced" && scored.match_reason) {
      await db.from("opportunity_matches").insert({
        opportunity_id: opportunityId,
        founder_id: founderId,
        match_reason: scored.match_reason,
        match_score: clamp(scored.priority_score),
      });
    }

    logger.info("opportunity.score: done", { opportunityId, status: newStatus, priority: scored.priority_score });
    return { status: newStatus, priority_score: scored.priority_score };
  },
});
