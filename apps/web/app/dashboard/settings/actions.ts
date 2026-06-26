"use server";

import { createServiceClient } from "@/lib/supabase/service";
import { getCurrentFounder } from "@/lib/founder";
import { revalidatePath } from "next/cache";

export type AutonomyMode = "manual" | "assisted" | "autopilot";

export async function updateSettings(formData: FormData) {
  const founder = await getCurrentFounder();
  const db = createServiceClient();

  const mode = (formData.get("mode") as AutonomyMode) ?? "assisted";
  const autopilotAck = formData.get("autopilot_ack") === "on";
  const focusTopics = formData.getAll("focus_topics").map(String).filter(Boolean);
  const contentGoals = formData.getAll("content_goals").map(String).filter(Boolean);
  const prohibitedTopics = formData.getAll("prohibited_topics").map(String).filter(Boolean);
  const tone = (formData.get("tone") as string | null)?.trim() ?? null;
  const extraNotes = (formData.get("extra_notes") as string | null)?.trim() ?? null;
  const maxPerDay = Math.min(10, Math.max(1, parseInt(formData.get("max_autopilot_per_day") as string ?? "3", 10)));

  if (mode === "autopilot" && !autopilotAck) {
    throw new Error("Autopilot requires explicit acknowledgement");
  }

  await db.from("operating_preferences").upsert(
    {
      founder_id: founder.id,
      mode,
      autopilot_enabled: mode === "autopilot",
      max_autopilot_per_day: maxPerDay,
      focus_topics: focusTopics,
      content_goals: contentGoals,
      prohibited_topics: prohibitedTopics,
      tone: tone || null,
      extra_notes: extraNotes || null,
    },
    { onConflict: "founder_id" }
  );

  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard");
}
