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

interface XTweet {
  id: string;
  text: string;
  author_id: string;
  public_metrics: { like_count: number; retweet_count: number; reply_count: number };
}

interface XUser { id: string; name: string; username: string }

interface QuoteDecision {
  selected_tweet_id: string;
  selected_tweet_content: string;
  selected_tweet_author: string;
  opinion: string;
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

async function searchRecentTweets(topics: string[]): Promise<{ tweets: XTweet[]; users: XUser[] }> {
  const bearerToken = process.env.X_BEARER_TOKEN;
  if (!bearerToken) throw new Error("X_BEARER_TOKEN not set");

  // Verified accounts only, exclude retweets + replies, English, last 24h
  const topicQuery = topics.slice(0, 3).map(t => `"${t}"`).join(" OR ");
  const query = `(${topicQuery}) is:verified -is:retweet -is:reply lang:en`;

  // last 24 hours only
  const startTime = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const params = new URLSearchParams({
    query,
    max_results: "25",
    start_time: startTime,
    sort_order: "relevancy",
    "tweet.fields": "public_metrics,author_id,created_at",
    "expansions": "author_id",
    "user.fields": "username,name",
  });

  const res = await fetch(`https://api.twitter.com/2/tweets/search/recent?${params}`, {
    headers: { Authorization: `Bearer ${bearerToken}` },
    signal: AbortSignal.timeout(30_000),
  });

  if (!res.ok) throw new Error(`X search failed (${res.status}): ${await res.text()}`);

  const data = await res.json() as {
    data?: XTweet[];
    includes?: { users?: XUser[] };
  };

  const allTweets = data.data ?? [];

  // Sort by engagement score (likes + 3× retweets) and drop anything with < 5 likes
  const tweets = allTweets
    .filter(t => t.public_metrics.like_count >= 5)
    .sort((a, b) =>
      (b.public_metrics.like_count + b.public_metrics.retweet_count * 3) -
      (a.public_metrics.like_count + a.public_metrics.retweet_count * 3)
    )
    .slice(0, 10); // top 10 by engagement to LLM

  return { tweets, users: data.includes?.users ?? [] };
}

async function pickAndGenerate(
  founderContext: string,
  topics: string[],
  tweets: XTweet[],
  users: XUser[],
): Promise<QuoteDecision | null> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY not set");

  const userMap = Object.fromEntries(users.map(u => [u.id, u]));
  const tweetList = tweets.map((t, i) => {
    const author = userMap[t.author_id];
    const engagement = `${t.public_metrics.like_count} likes, ${t.public_metrics.retweet_count} RTs, ${t.public_metrics.reply_count} replies`;
    return `[${i + 1}] Tweet ID: ${t.id}\n@${author?.username ?? "unknown"} (${engagement}):\n${t.text}`;
  }).join("\n\n");

  const prompt = `You manage X (Twitter) for a founder. Pick the best tweet to quote-tweet and write a punchy, opinionated response.

FOUNDER CONTEXT:
${founderContext || "A founder building a B2B SaaS product"}

TOPICS: ${topics.join(", ")}

RECENT TWEETS:
${tweetList}

Pick the ONE tweet that will start the best conversation. Prefer tweets with high engagement (likes + RTs) — those are already going viral and will give the quote tweet maximum reach. Write an opinion that agrees, disagrees, or adds a surprising angle.

Rules:
- Opinion under 260 characters
- Genuinely opinionated — no "great point" filler
- No hashtags
- Sound like a real founder, not a content bot

Return ONLY valid JSON:
{
  "selected_tweet_id": "<exact tweet id from above>",
  "selected_tweet_content": "<full original tweet text>",
  "selected_tweet_author": "@<username>",
  "opinion": "<your quote tweet text>"
}`;

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://influuc.com",
      "X-Title": "Influuc Quote Engine",
    },
    body: JSON.stringify({
      model: "anthropic/claude-haiku-4-5",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      max_tokens: 500,
    }),
    signal: AbortSignal.timeout(60_000),
  });

  if (!res.ok) throw new Error(`OpenRouter ${res.status}: ${await res.text()}`);

  const data = await res.json() as { choices: Array<{ message: { content: string } }> };
  return extractJson<QuoteDecision>(data.choices?.[0]?.message?.content ?? "");
}

// Runs at 1:30 UTC = 7:00 AM IST daily
// Discovers one tweet per founder to quote at 10:30 AM IST (UTC 5)
export const tweetDiscover = schedules.task({
  id: "tweet.discover",
  cron: "30 1 * * *",
  maxDuration: 300,
  retry: { maxAttempts: 2, minTimeoutInMs: 5000, maxTimeoutInMs: 30000, factor: 2 },

  run: async () => {
    const db = createDb();
    const todayStr = new Date().toISOString().split("T")[0]!;

    const { data: founders } = await db
      .from("founders")
      .select("id")
      .eq("onboarding_state", "done");

    if (!founders?.length) {
      logger.info("tweet.discover: no active founders");
      return { processed: 0 };
    }

    let processed = 0;

    for (const founder of founders) {
      try {
        // Must have active X connection
        const { data: conn } = await db
          .from("platform_connections")
          .select("id")
          .eq("founder_id", founder.id)
          .eq("platform", "x")
          .eq("status", "active")
          .single();

        if (!conn) continue;

        // Idempotency — skip if already generated today
        const { data: existing } = await db
          .from("weekly_posts")
          .select("id")
          .eq("founder_id", founder.id)
          .eq("scheduled_date", todayStr)
          .eq("post_type", "x_quote_tweet")
          .limit(1)
          .single();

        if (existing) continue;

        // Get current strategy (needed for strategy_id FK)
        const { data: strategy } = await db
          .from("weekly_strategies")
          .select("id, week_start")
          .eq("founder_id", founder.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        if (!strategy) continue;

        // Topics + brain context
        const { data: prefs } = await db
          .from("operating_preferences")
          .select("focus_topics")
          .eq("founder_id", founder.id)
          .single();

        const topics: string[] = prefs?.focus_topics ?? ["startups", "founders", "saas"];

        const { data: facts } = await db
          .from("brain_facts")
          .select("key, content")
          .eq("founder_id", founder.id)
          .eq("status", "active")
          .limit(15);

        const founderContext = (facts ?? []).map(f => `${f.key}: ${f.content}`).join("\n");

        // Search & pick
        const { tweets, users } = await searchRecentTweets(topics);
        if (!tweets.length) { logger.info("tweet.discover: no tweets found", { founderId: founder.id }); continue; }

        // Exclude tweet IDs already claimed by other founders today — prevents
        // multiple accounts all quote-tweeting the same post simultaneously
        const { data: claimedToday } = await db
          .from("weekly_posts")
          .select("source_tweet_id")
          .eq("post_type", "x_quote_tweet")
          .eq("scheduled_date", todayStr)
          .not("source_tweet_id", "is", null);

        const claimedIds = new Set((claimedToday ?? []).map(r => r.source_tweet_id).filter(Boolean));
        const availableTweets = tweets.filter(t => !claimedIds.has(t.id));

        if (!availableTweets.length) {
          logger.info("tweet.discover: all found tweets already claimed today", { founderId: founder.id });
          continue;
        }

        const decision = await pickAndGenerate(founderContext, topics, availableTweets, users);
        if (!decision?.selected_tweet_id || !decision?.opinion) continue;

        await db.from("weekly_posts").insert({
          founder_id: founder.id,
          strategy_id: strategy.id,
          week_start: strategy.week_start,
          platform: "x",
          scheduled_date: todayStr,
          post_type: "x_quote_tweet",
          sort_order: 0,
          content: decision.opinion,
          status: "draft",
          source_tweet_id: decision.selected_tweet_id,
          source_tweet_content: decision.selected_tweet_content,
          source_tweet_author: decision.selected_tweet_author,
        });

        logger.info("tweet.discover: inserted quote tweet", { founderId: founder.id, tweetId: decision.selected_tweet_id });
        processed++;
      } catch (err) {
        logger.error("tweet.discover: founder failed (non-fatal)", { founderId: founder.id, err: String(err) });
      }
    }

    logger.info("tweet.discover: done", { processed, total: founders.length });
    return { processed };
  },
});
