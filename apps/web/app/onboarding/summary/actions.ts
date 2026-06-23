"use server";

import { createServiceClient } from "@/lib/supabase/service";
import { getCurrentFounder } from "@/lib/founder";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function confirmFact(factId: string) {
  const founder = await getCurrentFounder();
  const db = createServiceClient();
  await db
    .from("brain_facts")
    .update({ status: "active", confidence: 0.9 })
    .eq("id", factId)
    .eq("founder_id", founder.id);
  revalidatePath("/onboarding/summary");
}

export async function editFact(factId: string, newContent: string) {
  const founder = await getCurrentFounder();
  if (!newContent.trim()) return;
  const db = createServiceClient();
  await db
    .from("brain_facts")
    .update({ status: "active", confidence: 0.95, content: newContent.trim() })
    .eq("id", factId)
    .eq("founder_id", founder.id);
  revalidatePath("/onboarding/summary");
}

export async function dismissFact(factId: string) {
  const founder = await getCurrentFounder();
  const db = createServiceClient();
  await db
    .from("brain_facts")
    .update({ status: "rejected" })
    .eq("id", factId)
    .eq("founder_id", founder.id);
  revalidatePath("/onboarding/summary");
}

export async function confirmAllFacts() {
  const founder = await getCurrentFounder();
  const db = createServiceClient();
  await db
    .from("brain_facts")
    .update({ status: "active" })
    .eq("founder_id", founder.id)
    .neq("status", "rejected");
  revalidatePath("/onboarding/summary");
}

export async function advanceToPaywall() {
  const founder = await getCurrentFounder();
  const db = createServiceClient();
  await db
    .from("founders")
    .update({ onboarding_state: "paywall" })
    .eq("id", founder.id)
    .in("onboarding_state", ["summary", "analysis"]);
  redirect("/onboarding/paywall");
}
