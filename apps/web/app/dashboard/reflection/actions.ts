"use server";

import { createServiceClient } from "@/lib/supabase/service";
import { getCurrentFounder } from "@/lib/founder";
import { tasks } from "@trigger.dev/sdk/v3";
import type { contentGenerate } from "@/trigger/content-generate";
import { revalidatePath } from "next/cache";

export interface ReflectionResponses {
  best_performing: string;
  audience_reaction: string;
  wins: string;
  next_week_focus: string;
  anything_else: string;
}

export async function submitReflection(responses: ReflectionResponses) {
  const founder = await getCurrentFounder();
  const db = createServiceClient();

  const now = new Date();
  const weekStart = now.toISOString().split("T")[0]!;

  // Save the reflection
  await db.from("weekly_reflections").upsert(
    { founder_id: founder.id, week_start: weekStart, responses: responses as unknown as import("@influuc/db").Json },
    { onConflict: "founder_id,week_start" }
  );

  // Advance next_generation_at by 7 days and clear flag
  const nextGenerationAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
  await db
    .from("founders")
    .update({ reflection_pending: false, next_generation_at: nextGenerationAt })
    .eq("id", founder.id);

  // Trigger content generation, pass reflection context for better strategy
  await tasks.trigger<typeof contentGenerate>("content.generate", {
    founderId: founder.id,
    weekStart,
  });

  revalidatePath("/dashboard");
}
