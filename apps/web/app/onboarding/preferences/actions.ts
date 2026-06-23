"use server";

import { createServiceClient } from "@/lib/supabase/service";
import { getCurrentFounder } from "@/lib/founder";
import { redirect } from "next/navigation";

export type AutonomyMode = "manual" | "assisted" | "autopilot";

export async function savePreferences(formData: FormData) {
  const mode = (formData.get("mode") as AutonomyMode) ?? "assisted";
  const autopilotAck = formData.get("autopilot_ack") === "on";

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
    },
    { onConflict: "founder_id" }
  );

  await db
    .from("founders")
    .update({ onboarding_state: "done" })
    .eq("id", founder.id)
    .in("onboarding_state", ["preferences", "trial", "paywall"]);

  redirect("/dashboard");
}
