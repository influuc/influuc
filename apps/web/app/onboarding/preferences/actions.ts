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

  await db
    .from("founders")
    .update({ onboarding_state: "done" })
    .eq("id", founder.id)
    .in("onboarding_state", ["preferences", "trial", "paywall"]);

  // Fire-and-forget: kick off first week's content generation
  const now = new Date();
  const day = now.getUTCDay();
  const diff = now.getUTCDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(now);
  monday.setUTCDate(diff);
  monday.setUTCHours(0, 0, 0, 0);
  const weekStart = monday.toISOString().split("T")[0]!;

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
