"use server";

import { getCurrentFounder } from "@/lib/founder";

/** Server-side state check — more reliable than client-side Supabase queries. */
export async function getAnalysisState(): Promise<{ onboarding_state: string } | null> {
  try {
    const founder = await getCurrentFounder();
    return { onboarding_state: founder.onboarding_state };
  } catch {
    return null;
  }
}
