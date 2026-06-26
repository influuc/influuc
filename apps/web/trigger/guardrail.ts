// Pre-publish guardrail: blocks unsafe / off-brand / prohibited content before it posts.
// Used by post.publish. Deterministic checks first (free), then a single LLM safety pass.

export interface GuardrailResult {
  verdict: "pass" | "fail";
  reasons: string | null;
  brandFit: number | null; // 0..1, advisory
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
    else if (ch === "}") { depth--; if (depth === 0) { try { return JSON.parse(text.slice(start, i + 1)) as T; } catch { return null; } } }
  }
  return null;
}

export async function runGuardrail(opts: {
  content: string;
  platform: "x" | "linkedin";
  prohibitedTopics: string[];
  brandContext: string; // positioning / voice facts
}): Promise<GuardrailResult> {
  const { content, platform, prohibitedTopics, brandContext } = opts;

  // ── 1. Deterministic checks (no LLM) ───────────────────────────────────────
  const trimmed = content.trim();
  if (!trimmed) {
    return { verdict: "fail", reasons: "Empty content.", brandFit: 0 };
  }
  if (trimmed.length > 6000) {
    return { verdict: "fail", reasons: "Content absurdly long — likely malformed.", brandFit: null };
  }

  // Prohibited-topic keyword match (case-insensitive, word-ish)
  const lower = trimmed.toLowerCase();
  const hit = prohibitedTopics
    .map((t) => t.trim().toLowerCase())
    .filter((t) => t.length >= 3 && lower.includes(t));
  if (hit.length) {
    return { verdict: "fail", reasons: `Mentions prohibited topic(s): ${hit.join(", ")}.`, brandFit: null };
  }

  // ── 2. LLM safety + brand-fit pass ─────────────────────────────────────────
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    // Fail open on safety infra outage, but log via reasons. Deterministic checks already passed.
    return { verdict: "pass", reasons: "LLM guardrail skipped (no API key).", brandFit: null };
  }

  const system = `You are a publishing safety reviewer for a founder's personal brand. Judge whether a post is SAFE and ON-BRAND to publish publicly. Block only clear problems: hate/harassment, threats, explicit content, doxxing, legal/medical/financial claims presented as fact, obvious misinformation, or anything that would embarrass a professional founder. Normal opinions, hot takes, and bold claims are fine. Return ONLY JSON.`;

  const user = `PLATFORM: ${platform}
FOUNDER BRAND CONTEXT:
${brandContext || "(general professional founder)"}

POST TO REVIEW:
"""
${trimmed}
"""

Return JSON:
{"safe": true|false, "brand_fit": 0.0-1.0, "reasons": "one sentence — only if unsafe or notably off-brand, else null"}`;

  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", "HTTP-Referer": "https://influuc.com" },
      body: JSON.stringify({
        model: "anthropic/claude-haiku-4-5",
        messages: [{ role: "system", content: system }, { role: "user", content: user }],
        temperature: 0,
        max_tokens: 200,
      }),
    });
    if (!res.ok) {
      return { verdict: "pass", reasons: `Guardrail LLM error ${res.status} — allowed.`, brandFit: null };
    }
    const j = await res.json() as { choices: [{ message: { content: string } }] };
    const parsed = extractJson<{ safe: boolean; brand_fit: number; reasons: string | null }>(j.choices[0].message.content);
    if (!parsed) return { verdict: "pass", reasons: "Guardrail parse failed — allowed.", brandFit: null };

    const brandFit = Math.min(1, Math.max(0, parsed.brand_fit ?? 0));
    if (parsed.safe === false) {
      return { verdict: "fail", reasons: parsed.reasons ?? "Flagged unsafe by safety review.", brandFit };
    }
    return { verdict: "pass", reasons: parsed.reasons ?? null, brandFit };
  } catch (err) {
    return { verdict: "pass", reasons: `Guardrail exception (${String(err).slice(0, 80)}) — allowed.`, brandFit: null };
  }
}
