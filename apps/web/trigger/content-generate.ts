import { task, logger } from "@trigger.dev/sdk/v3";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@influuc/db";

// WebSocket polyfill — same requirement as brain-bootstrap
if (typeof globalThis.WebSocket === "undefined") {
  // @ts-ignore
  globalThis.WebSocket = class StubWS extends EventTarget {
    static CONNECTING = 0; static OPEN = 1; static CLOSING = 2; static CLOSED = 3;
    readyState = 3;
    close() {}
    send() {}
  };
}

function createDb() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

const OPENROUTER_BASE = "https://openrouter.ai/api/v1";
const STRATEGY_MODEL = "anthropic/claude-haiku-4-5";
const POSTS_MODEL    = "anthropic/claude-haiku-4-5";

export type ContentGeneratePayload = {
  founderId: string;
  weekStart: string; // "YYYY-MM-DD" — first day of the 7-day window (signup day or reflection day)
};

interface StrategyIdea {
  day: number;
  date: string;
  theme: string;
  hook: string;
  talking_points: string[];
}

interface WeeklyStrategy {
  week_of: string;
  summary: string;
  ideas: StrategyIdea[];
}

interface PostSet {
  x_short_1: string;
  x_short_2: string;
  x_long: string;
  linkedin: string;
}

/** Extract the first balanced JSON object from a string (handles markdown fences). */
function extractJson<T>(text: string): T | null {
  const start = text.indexOf("{");
  if (start === -1) return null;
  let depth = 0, inStr = false, escaped = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (escaped) { escaped = false; continue; }
    if (ch === "\\" && inStr) { escaped = true; continue; }
    if (ch === '"') { inStr = !inStr; continue; }
    if (inStr) continue;
    if (ch === "{") depth++;
    else if (ch === "}") { depth--; if (depth === 0) { try { return JSON.parse(text.slice(start, i + 1)) as T; } catch { return null; } } }
  }
  return null;
}

async function callOpenRouter(model: string, prompt: string, systemPrompt: string): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY not set");

  const res = await fetch(`${OPENROUTER_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://influuc.com",
      "X-Title": "Influuc Content Engine",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user",   content: prompt },
      ],
      response_format: { type: "json_object" },
      max_tokens: 6000,
    }),
    signal: AbortSignal.timeout(120_000),
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`OpenRouter ${res.status}: ${txt}`);
  }

  const data = (await res.json()) as {
    choices: Array<{ message: { content: string } }>;
    error?: { message: string };
  };

  if (data.error) throw new Error(`OpenRouter API error: ${data.error.message}`);
  return data.choices?.[0]?.message?.content ?? "";
}

/** Add days to a date string "YYYY-MM-DD" and return new "YYYY-MM-DD". */
function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().split("T")[0]!;
}

export const contentGenerate = task({
  id: "content.generate",
  maxDuration: 600,
  retry: { maxAttempts: 2, minTimeoutInMs: 5000, maxTimeoutInMs: 30000, factor: 2 },

  run: async (payload: ContentGeneratePayload) => {
    const { founderId, weekStart } = payload;
    const db = createDb();

    logger.info("content.generate starting", { founderId, weekStart });

    // ── 1. Load brain facts ──────────────────────────────────────────────────
    const { data: facts } = await db
      .from("brain_facts")
      .select("layer, key, content, confidence")
      .eq("founder_id", founderId)
      .eq("status", "active")
      .order("confidence", { ascending: false })
      .limit(60);

    const brainText = (facts ?? [])
      .map((f) => `[${f.layer}] ${f.key}: ${f.content}`)
      .join("\n");

    // ── 2. Load preferences ──────────────────────────────────────────────────
    const { data: prefs } = await db
      .from("operating_preferences")
      .select("focus_topics, content_goals, tone, prohibited_topics, extra_notes")
      .eq("founder_id", founderId)
      .single();

    const focusTopics     = prefs?.focus_topics?.join(", ")     ?? "general founder/business topics";
    const contentGoals    = prefs?.content_goals?.join(", ")    ?? "build authority";
    const tone            = prefs?.tone                          ?? "direct";
    const prohibitedRaw   = prefs?.prohibited_topics ?? [];
    const prohibited      = prohibitedRaw.length ? prohibitedRaw.join(", ") : "none";
    const extraNotes      = prefs?.extra_notes                  ?? "";

    // ── 2b. Load last week's reflection ─────────────────────────────────────
    const { data: lastReflection } = await db
      .from("weekly_reflections")
      .select("responses, week_start")
      .eq("founder_id", founderId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    const reflection = lastReflection?.responses as {
      best_performing?: string;
      audience_reaction?: string;
      wins?: string;
      next_week_focus?: string;
      anything_else?: string;
    } | null;

    const reflectionBlock = reflection
      ? `
LAST WEEK'S REFLECTION (use this to improve this week's strategy):
- What performed best: ${reflection.best_performing || "not specified"}
- Audience reaction: ${reflection.audience_reaction || "not specified"}
- Wins/milestones: ${reflection.wins || "not specified"}
- Focus for this week: ${reflection.next_week_focus || "not specified"}
- Other notes: ${reflection.anything_else || "none"}
`
      : "";

    // ── 3. Strategy call (LLM Call 1) ────────────────────────────────────────
    logger.info("content.generate: strategy call starting");

    const strategySystem = `You are a world-class content strategist helping a founder build their personal brand through consistent, authentic social media content. You are given their founder brain facts and content preferences. Generate a precise, varied, high-quality weekly content plan grounded in who they actually are.`;

    const strategyPrompt = `FOUNDER BRAIN FACTS:
${brainText || "(no brain facts available yet — use general founder expertise)"}

CONTENT PREFERENCES:
- Focus topics: ${focusTopics}
- Content goals: ${contentGoals}
- Posting tone: ${tone}
- Topics to avoid: ${prohibited}
${extraNotes ? `- Extra notes: ${extraNotes}` : ""}
${reflectionBlock}

Generate a content strategy for 7 consecutive days starting ${weekStart} (days: ${weekStart} through ${addDays(weekStart, 6)}).

Each day needs ONE strong, distinct content idea. Ideas must:
- Be grounded in the founder's actual brain facts and expertise
- Vary across the week — no repeated themes or angles
- Directly serve their stated content goals
- Match their preferred tone
- Strictly avoid prohibited topics
- Feel authentic, not generic

Return ONLY valid JSON (no markdown, no explanation):
{
  "week_of": "${weekStart}",
  "summary": "One sentence describing this week's overarching content theme",
  "ideas": [
    {
      "day": 1,
      "date": "${weekStart}",
      "theme": "Specific, compelling topic/angle (10-15 words)",
      "hook": "A single punchy opening line that would stop the scroll",
      "talking_points": ["specific point 1", "specific point 2", "specific point 3"]
    }
  ]
}

The ideas array must have exactly 7 entries starting from the provided start date (day 1 = ${weekStart}, day 2 = ${addDays(weekStart, 1)}, ..., day 7 = ${addDays(weekStart, 6)}). Use the exact dates — do NOT snap to Monday.`;

    const strategyRaw = await callOpenRouter(STRATEGY_MODEL, strategyPrompt, strategySystem);
    logger.info("content.generate: strategy raw", { preview: strategyRaw.slice(0, 300) });

    const strategy = extractJson<WeeklyStrategy>(strategyRaw);
    if (!strategy || !Array.isArray(strategy.ideas) || strategy.ideas.length === 0) {
      throw new Error("Strategy LLM returned invalid JSON or empty ideas");
    }

    // Ensure exactly 7 ideas with correct dates
    const ideas: StrategyIdea[] = Array.from({ length: 7 }, (_, i) => ({
      day: i + 1,
      date: addDays(weekStart, i),
      theme: strategy.ideas[i]?.theme ?? `Day ${i + 1} content`,
      hook: strategy.ideas[i]?.hook ?? "",
      talking_points: strategy.ideas[i]?.talking_points ?? [],
    }));

    // ── 4. Store strategy ────────────────────────────────────────────────────
    const { data: strategyRow, error: stratErr } = await db
      .from("weekly_strategies")
      .upsert(
        { founder_id: founderId, week_start: weekStart, strategy: { ...strategy, ideas } as unknown as Database["public"]["Tables"]["weekly_strategies"]["Insert"]["strategy"] },
        { onConflict: "founder_id,week_start" }
      )
      .select("id")
      .single();

    if (stratErr || !strategyRow) {
      throw new Error(`Failed to store strategy: ${stratErr?.message}`);
    }

    const strategyId = strategyRow.id;
    logger.info("content.generate: strategy stored", { strategyId });

    // ── 5. Post generation calls (LLM Call 2 — 7 in parallel) ───────────────
    const postsSystem = `You are a world-class social media copywriter creating posts for a founder's personal brand. You write in the founder's authentic voice using their real expertise and stories. Every post must be immediately valuable and worth reading. Never use filler phrases like "Great question" or "In today's world". Be specific, not generic.`;

    const generatePosts = async (idea: StrategyIdea): Promise<PostSet | null> => {
      const postsPrompt = `FOUNDER VOICE & EXPERTISE:
${brainText || "(write as a knowledgeable founder)"}

TONE: ${tone}
STRICTLY AVOID: ${prohibited}

TODAY'S CONTENT IDEA (${idea.date}):
Theme: ${idea.theme}
Hook: ${idea.hook}
Talking points: ${idea.talking_points.join(" | ")}

Write 4 posts based on this idea. Each must feel like a natural variation — same theme, different angle or format.

X SHORT POST 1 (STRICT MAX 480 characters including spaces — count carefully): A punchy, standalone insight or bold take. Pack real value into as few words as possible.

X SHORT POST 2 (STRICT MAX 480 characters including spaces — count carefully): A different angle — question, contrarian take, concrete stat, or distilled lesson. No overlap with Short 1.

X LONG POST (STRICT MIN 1000 characters): A thread-style post or mini-essay. Use line breaks. Number key points. Dense with specific, actionable insight.

LINKEDIN POST (STRICT MIN 2000 characters): Long-form, story-driven or insight-heavy. Start with a personal hook. Build to a lesson. End with a call to reflection or action. Professional but human. Several paragraphs.

Return ONLY valid JSON:
{
  "x_short_1": "...",
  "x_short_2": "...",
  "x_long": "...",
  "linkedin": "..."
}`;

      try {
        const raw = await callOpenRouter(POSTS_MODEL, postsPrompt, postsSystem);
        return extractJson<PostSet>(raw);
      } catch (err) {
        logger.warn("content.generate: post generation failed for day", { day: idea.day, err: String(err) });
        return null;
      }
    };

    const postSets = await Promise.all(ideas.map(generatePosts));

    // ── 6. Store all posts ───────────────────────────────────────────────────
    const postsToInsert: Database["public"]["Tables"]["weekly_posts"]["Insert"][] = [];

    for (let i = 0; i < ideas.length; i++) {
      const idea = ideas[i]!;
      const posts = postSets[i];

      if (!posts) {
        logger.warn("content.generate: skipping day with no posts", { day: idea.day });
        continue;
      }

      const date = idea.date;

      postsToInsert.push(
        { founder_id: founderId, strategy_id: strategyId, week_start: weekStart, platform: "x",        scheduled_date: date, post_type: "x_short", sort_order: 0, content: posts.x_short_1 },
        { founder_id: founderId, strategy_id: strategyId, week_start: weekStart, platform: "x",        scheduled_date: date, post_type: "x_short", sort_order: 1, content: posts.x_short_2 },
        { founder_id: founderId, strategy_id: strategyId, week_start: weekStart, platform: "x",        scheduled_date: date, post_type: "x_long",  sort_order: 2, content: posts.x_long },
        { founder_id: founderId, strategy_id: strategyId, week_start: weekStart, platform: "linkedin", scheduled_date: date, post_type: "linkedin", sort_order: 0, content: posts.linkedin },
      );
    }

    if (postsToInsert.length > 0) {
      const { error: insertErr } = await db.from("weekly_posts").insert(postsToInsert);
      if (insertErr) throw new Error(`Failed to insert posts: ${insertErr.message}`);
    }

    // Set next_generation_at to next week if it's not already scheduled.
    // This ensures week 2+ auto-generation works via content-weekly-cron.
    const { data: founderRow } = await db
      .from("founders")
      .select("next_generation_at, account_id")
      .eq("id", founderId)
      .single();

    if (!founderRow?.next_generation_at) {
      const nextWeek = addDays(weekStart, 7);
      await db.from("founders").update({ next_generation_at: nextWeek + "T00:00:00Z" }).eq("id", founderId);
      logger.info("content.generate: scheduled next generation", { nextWeek });
    }

    // Email the founder their content is ready
    try {
      if (founderRow?.account_id && process.env.RESEND_API_KEY) {
        const { data: authData } = await db.auth.admin.getUserById(founderRow.account_id);
        const email = authData?.user?.email;
        if (email) {
          const { Resend } = await import("resend");
          const resend = new Resend(process.env.RESEND_API_KEY);
          await resend.emails.send({
            from: process.env.RESEND_FROM_EMAIL ?? "Influuc <onboarding@resend.dev>",
            to: [email],
            subject: "Your weekly content is ready",
            text: `Your Influuc content for the week of ${weekStart} is ready — ${postsToInsert.length} posts generated across X and LinkedIn.\n\nReview and approve: https://influuc.com/dashboard/x`,
          });
        }
      }
    } catch (emailErr) {
      logger.warn("content.generate: email failed (non-fatal)", { err: String(emailErr) });
    }

    logger.info("content.generate: done", { strategyId, postsInserted: postsToInsert.length });

    return {
      strategyId,
      weekStart,
      postsInserted: postsToInsert.length,
    };
  },
});
