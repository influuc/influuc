"use server";

import { createServiceClient } from "@/lib/supabase/service";
import { getCurrentFounder } from "@/lib/founder";
import { redirect } from "next/navigation";
import { tasks } from "@trigger.dev/sdk/v3";
import type { contentGenerate } from "@/trigger/content-generate";

export type AutonomyMode = "manual" | "assisted" | "autopilot";

export async function savePreferences(formData: FormData) {
  const mode = (formData.get("mode") as AutonomyMode) ?? "assisted";
  const autopilotAck = formData.get("autopilot_ack") === "on";
  const focusTopics = formData.getAll("focus_topics").map(String).filter(Boolean);
  const contentGoals = formData.getAll("content_goals").map(String).filter(Boolean);
  const prohibitedTopics = formData.getAll("prohibited_topics").map(String).filter(Boolean);
  const tone = (formData.get("tone") as string | null)?.trim() ?? null;
  const extraNotes = (formData.get("extra_notes") as string | null)?.trim() ?? null;

  if (mode === "autopilot" && !autopilotAck) {
    throw new Error("Autopilot requires explicit acknowledgement");
  }

  const founder = await getCurrentFounder();
  const db = createServiceClient();

  await db.from("operating_preferences").upsert(
    {
      founder_id: founder.id,
      mode,
      autopilot_enabled: mode === "autopilot",
      focus_topics: focusTopics,
      content_goals: contentGoals,
      prohibited_topics: prohibitedTopics,
      tone: tone || null,
      extra_notes: extraNotes || null,
    },
    { onConflict: "founder_id" }
  );

  // Rolling 7-day: next generation is exactly 7 days from now
  const now = new Date();
  const nextGenerationAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const weekStart = now.toISOString().split("T")[0]!;

  await db
    .from("founders")
    .update({ onboarding_state: "done", next_generation_at: nextGenerationAt })
    .eq("id", founder.id)
    .in("onboarding_state", ["preferences", "trial", "paywall"]);

  // Fire-and-forget: kick off first week's content generation
  try {
    await tasks.trigger<typeof contentGenerate>("content.generate", {
      founderId: founder.id,
      weekStart,
    });
  } catch (err) {
    console.error("[savePreferences] content.generate trigger failed:", err);
  }

  redirect("/dashboard");
}
