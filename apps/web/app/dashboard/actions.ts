"use server";

import { createServiceClient } from "@/lib/supabase/service";
import { createClient } from "@/lib/supabase/server";
import { getCurrentFounder } from "@/lib/founder";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { tasks } from "@trigger.dev/sdk/v3";

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/sign-in");
}

export async function updatePostStatus(postId: string, status: "approved" | "rejected" | "draft") {
  const founder = await getCurrentFounder();
  const db = createServiceClient();
  await db
    .from("weekly_posts")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", postId)
    .eq("founder_id", founder.id);
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/x");
  revalidatePath("/dashboard/linkedin");
}

export async function updatePostContent(postId: string, content: string) {
  const founder = await getCurrentFounder();
  const db = createServiceClient();
  await db
    .from("weekly_posts")
    .update({ content, updated_at: new Date().toISOString() })
    .eq("id", postId)
    .eq("founder_id", founder.id);
  revalidatePath("/dashboard/x");
  revalidatePath("/dashboard/linkedin");
}

export async function approveAllPosts(strategyId: string, platform: "x" | "linkedin") {
  const founder = await getCurrentFounder();
  const db = createServiceClient();
  await db
    .from("weekly_posts")
    .update({ status: "approved", updated_at: new Date().toISOString() })
    .eq("founder_id", founder.id)
    .eq("strategy_id", strategyId)
    .eq("platform", platform)
    .in("status", ["draft", "rejected"]);
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/x");
  revalidatePath("/dashboard/linkedin");
}

export async function regeneratePost(postId: string) {
  const founder = await getCurrentFounder();
  const db = createServiceClient();

  const { data: post } = await db
    .from("weekly_posts")
    .select("platform, post_type, sort_order, scheduled_date, strategy_id, content")
    .eq("id", postId)
    .eq("founder_id", founder.id)
    .single();

  if (!post) throw new Error("Post not found");

  const [{ data: facts }, { data: prefs }, { data: strategy }] = await Promise.all([
    db.from("brain_facts").select("layer, key, content, confidence").eq("founder_id", founder.id).eq("status", "active").order("confidence", { ascending: false }).limit(60),
    db.from("operating_preferences").select("focus_topics, content_goals, tone, prohibited_topics").eq("founder_id", founder.id).single(),
    db.from("weekly_strategies").select("strategy").eq("id", post.strategy_id!).single(),
  ]);

  const brainText = (facts ?? []).map(f => `[${f.layer}] ${f.key}: ${f.content}`).join("\n");
  const tone = prefs?.tone ?? "direct";
  const prohibited = prefs?.prohibited_topics?.join(", ") ?? "none";

  type StratJson = { ideas?: Array<{ date: string; theme: string; hook: string; talking_points: string[] }> };
  const strat = strategy?.strategy as StratJson | null;
  const idea = strat?.ideas?.find(i => i.date === post.scheduled_date);
  const ideaCtx = idea
    ? `TODAY'S THEME: ${idea.theme}\nHOOK: ${idea.hook}\nTALKING POINTS: ${idea.talking_points.join(" | ")}`
    : "Generate a fresh, insightful post based on the founder's expertise.";

  const instructions: Record<string, string> = {
    x_short: "X SHORT POST — STRICT MAX 480 characters. Punchy standalone insight, bold take, or distilled lesson.",
    x_long:  "X LONG POST — STRICT MIN 1000 characters. Thread-style or mini-essay. Line breaks. Dense with specific insight.",
    linkedin: "LINKEDIN POST — STRICT MIN 2000 characters. Story-driven. Personal hook, build to a lesson, end with a CTA. Professional but human.",
  };

  const prompt = `FOUNDER VOICE & EXPERTISE:\n${brainText || "(knowledgeable founder)"}\n\nTONE: ${tone}\nSTRICTLY AVOID: ${prohibited}\n\n${ideaCtx}\n\nPREVIOUS VERSION (write a DIFFERENT angle — avoid repeating the same ideas):\n${post.content}\n\nWrite a completely fresh version. ${instructions[post.post_type] ?? instructions.x_short}\n\nReturn ONLY valid JSON: { "content": "..." }`;

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY not set");

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", "HTTP-Referer": "https://influuc.com", "X-Title": "Influuc" },
    body: JSON.stringify({
      model: "anthropic/claude-haiku-4-5",
      messages: [
        { role: "system", content: "You are a world-class social media copywriter. Generate a completely fresh version of this post — same theme, entirely different angle. Return JSON only." },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
      max_tokens: 2000,
    }),
    signal: AbortSignal.timeout(50_000),
  });

  if (!res.ok) throw new Error(`OpenRouter error ${res.status}: ${await res.text()}`);
  const data = await res.json() as { choices: Array<{ message: { content: string } }> };
  const raw = data.choices?.[0]?.message?.content ?? "";
  const start = raw.indexOf("{"), end = raw.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("LLM returned invalid JSON");
  const parsed = JSON.parse(raw.slice(start, end + 1)) as { content?: string };
  const newContent = parsed?.content;
  if (!newContent) throw new Error("LLM returned empty content");

  await db.from("weekly_posts")
    .update({ content: newContent, status: "draft", updated_at: new Date().toISOString() })
    .eq("id", postId)
    .eq("founder_id", founder.id);

  revalidatePath("/dashboard/x");
  revalidatePath("/dashboard/linkedin");
}

export async function triggerWeeklyRegenerate() {
  const founder = await getCurrentFounder();
  const db = createServiceClient();

  // Get the current active week strategy
  const { data: strategy } = await db
    .from("weekly_strategies")
    .select("week_start")
    .eq("founder_id", founder.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (!strategy) throw new Error("No strategy found — complete onboarding first.");

  // Delete existing draft posts for this week so the regeneration doesn't duplicate
  await db
    .from("weekly_posts")
    .delete()
    .eq("founder_id", founder.id)
    .eq("week_start", strategy.week_start)
    .in("status", ["draft", "rejected"]);

  // Trigger content generation task
  await tasks.trigger("content.generate", { founderId: founder.id, weekStart: strategy.week_start });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/x");
  revalidatePath("/dashboard/linkedin");
}
