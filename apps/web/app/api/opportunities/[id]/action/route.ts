import { NextResponse } from "next/server";
import { getCurrentFounder } from "@/lib/founder";
import { createServiceClient } from "@/lib/supabase/service";

const OPENROUTER_BASE = "https://openrouter.ai/api/v1";
const WRITER_MODEL = "anthropic/claude-haiku-4-5";

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

async function writeXPost(opts: {
  brainText: string;
  tone: string;
  prohibited: string;
  title: string;
  summary: string | null;
  matchReason: string | null;
}): Promise<string | null> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY not set");

  const system = `You are a world-class social media copywriter writing a single X post for a founder reacting to a timely industry development. You write in the founder's authentic voice using their real expertise. The post must add the founder's own perspective — not just summarize the news. Never use filler like "Great question" or "In today's world". Be specific and opinionated.`;

  const prompt = `FOUNDER VOICE & EXPERTISE:
${opts.brainText || "(write as a knowledgeable founder)"}

TONE: ${opts.tone}
STRICTLY AVOID: ${opts.prohibited}

TIMELY OPPORTUNITY THE FOUNDER IS REACTING TO:
Headline: ${opts.title}
Context: ${opts.summary ?? "(no summary)"}
Why it matters to this founder: ${opts.matchReason ?? "(relevant to their space)"}

Write ONE X post (STRICT MAX 480 characters including spaces — count carefully) that reacts to this development with the founder's distinct point of view. Lead with a hook or bold take. Tie it back to their expertise or what they're building. Make it feel native to X — punchy, no hashtags, no "thread" framing.

Return ONLY valid JSON: {"post": "..."}`;

  const res = await fetch(`${OPENROUTER_BASE}/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", "HTTP-Referer": "https://influuc.com" },
    body: JSON.stringify({
      model: WRITER_MODEL,
      messages: [{ role: "system", content: system }, { role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 500,
    }),
  });
  if (!res.ok) throw new Error(`OpenRouter error (${res.status}): ${await res.text()}`);
  const j = await res.json() as { choices: [{ message: { content: string } }] };
  const parsed = extractJson<{ post: string }>(j.choices[0].message.content);
  return parsed?.post?.trim() ?? null;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    const founder = await getCurrentFounder();
    const { action } = (await request.json()) as { action: "accept" | "dismiss" };

    if (action !== "accept" && action !== "dismiss") {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const db = createServiceClient();

    // ── Dismiss: just flip status ────────────────────────────────────────────
    if (action === "dismiss") {
      const { error } = await db
        .from("opportunities")
        .update({ status: "dismissed" })
        .eq("id", id)
        .eq("founder_id", founder.id)
        .in("status", ["surfaced", "accepted", "dismissed"]);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true, status: "dismissed" });
    }

    // ── Accept (= Write post): generate an X draft into the review queue ──────
    const { data: opp } = await db
      .from("opportunities")
      .select("id, title, summary, status")
      .eq("id", id)
      .eq("founder_id", founder.id)
      .single();

    if (!opp) return NextResponse.json({ error: "Opportunity not found" }, { status: 404 });

    // Current strategy is required (weekly_posts.strategy_id is NOT NULL)
    const { data: strategy } = await db
      .from("weekly_strategies")
      .select("id, week_start")
      .eq("founder_id", founder.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (!strategy) {
      return NextResponse.json(
        { error: "No active content week yet. Generate your weekly content first." },
        { status: 409 },
      );
    }

    // Load voice + tone + match reason in parallel
    const [{ data: facts }, { data: prefs }, { data: match }] = await Promise.all([
      db.from("brain_facts")
        .select("layer, key, content")
        .eq("founder_id", founder.id)
        .eq("status", "active")
        .order("confidence", { ascending: false })
        .limit(40),
      db.from("operating_preferences")
        .select("tone, prohibited_topics")
        .eq("founder_id", founder.id)
        .single(),
      db.from("opportunity_matches")
        .select("match_reason")
        .eq("opportunity_id", id)
        .limit(1)
        .maybeSingle(),
    ]);

    const brainText = (facts ?? []).map(f => `[${f.layer}] ${f.key ?? "fact"}: ${f.content}`).join("\n");
    const tone = prefs?.tone ?? "direct";
    const prohibitedArr = (prefs?.prohibited_topics as string[] | null) ?? [];
    const prohibited = prohibitedArr.length ? prohibitedArr.join(", ") : "none";

    const content = await writeXPost({
      brainText, tone, prohibited,
      title: opp.title,
      summary: opp.summary,
      matchReason: match?.match_reason ?? null,
    });

    if (!content) {
      return NextResponse.json({ error: "Draft generation failed — try again." }, { status: 502 });
    }

    // Schedule the reactive post for tomorrow's afternoon X slot (x_short / sort_order 1)
    const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

    const { data: post, error: insErr } = await db
      .from("weekly_posts")
      .insert({
        founder_id: founder.id,
        strategy_id: strategy.id,
        week_start: strategy.week_start,
        platform: "x",
        scheduled_date: tomorrow,
        post_type: "x_short",
        sort_order: 1,
        content,
        status: "draft",
      })
      .select("id")
      .single();

    if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 });

    await db.from("opportunities").update({ status: "accepted" }).eq("id", id);

    return NextResponse.json({ ok: true, status: "accepted", postId: post.id, content });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
